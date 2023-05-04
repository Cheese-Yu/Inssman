import RuleService from 'services/RuleService';
import StorageService from 'services/StorageService';
import BSService from 'services/BrowserSupportService';
import handleError from './errorHandler';
import { PostMessageAction } from 'models/postMessageActionModel';
import { PageType } from 'src/models/formFieldModel';
import { NAMESPACE } from 'src/models/contants';
import { StorageKey } from 'src/models/storageModel';
import 'services/WebRequestService';
import 'services/InjectFileService';
import Rule = chrome.declarativeNetRequest.Rule;

class ServiceWorker {
  constructor() {
    this.registerListener();
  };

  registerListener(): void {
    chrome.runtime.onInstalled.addListener(this.onInstalled);
    chrome.runtime.onMessage.addListener(this.onMessage);
    chrome.tabs.onUpdated.addListener(this.onUpdatedTab)
  };

  onInstalled = async () => {
    //temproary function to remove old rules;
    const isCleared = (await StorageService.get(StorageKey.IS_CLEAR))[StorageKey.IS_CLEAR];
    if(chrome.runtime.getManifest().version < '1.0.14' && !isCleared) {
      await RuleService.erase();
      await StorageService.erase();
      await StorageService.set({[StorageKey.IS_CLEAR]: true});
      await StorageService.set({[StorageKey.NEXT_ID]: 1});
    }
  }

  onUpdatedTab = async(tabId, _, tab): Promise<void> => {
    if(BSService.isSupportScriptting()){
      if (
        tab.url?.startsWith("chrome://") ||
        tab.url?.startsWith('chrome-extension') ||
        tab.url?.startsWith('https://chrome.google.com')) return;
      const rules = await this.getStorageRulesByProperty({property: 'pageType', value: PageType.MODIFY_REQUEST_BODY});
      chrome.scripting.executeScript({
        target : {tabId},
        func: (rules, NAMESPACE) => {
          window[NAMESPACE as string].rules = rules;
          window[NAMESPACE as string]?.start();
        },
        world: 'MAIN',
        args: [rules, NAMESPACE],
        // @ts-ignore
        injectImmediately: true,
      }).catch(() => {
        // should be tracking here
      });
    }
  }

  onMessage = (request, _, sendResponse): boolean => {
    const { action, data } = request;
    (async () => {
      let responseData: any;
      try {
        if(action === PostMessageAction.GetStorageRules) {
          responseData = this.getStorageRules();
        } else if(action === PostMessageAction.GetRuleById) {
          responseData = this.getRuleById(data);
        } else if(action === PostMessageAction.AddRule) {
          responseData = this.addRule(data);
        } else if(action === PostMessageAction.UpdateRule) {
          responseData = this.updateRule(data);
        } else if(action === PostMessageAction.DeleteRule) {
          responseData = this.deleteRule(data);
        } else if(action === PostMessageAction.DeleteRuleById) {
          responseData = this.deleteRuleById(data);
        } else if(action === PostMessageAction.GetUserId) {
          responseData = this.getUserId();
        } else if(action === PostMessageAction.ERASE) {
          responseData = this.erase();
        }
        sendResponse(await responseData);
      } catch (error) {
        sendResponse({error: true, info: handleError(error, {action: PostMessageAction[action], data: request.data})})
      }
    })();
    return true;
  };

  async getRuleById(data): Promise<any> {
    const rule: Rule = await RuleService.getRuleById(data.id);
    const ruleData = await StorageService.get(String(data.id));
    return {rule, ruleData: ruleData[data.id]};
  }

  async addRule(data): Promise<void> {
    const id: number = await StorageService.generateNextId();
    if(data.rule) {
      await RuleService.add([{id, ...data.rule}]);
    }
    await StorageService.set({[id]: { ...data.ruleData, id }});
    await StorageService.set({[StorageKey.NEXT_ID]: id});
  }
  
  async updateRule(data): Promise<void> {
    if(data.rule) {
      await RuleService.add([data.rule], [data.rule])
    }
    await StorageService.set({[data.ruleData.id]: data.ruleData});
  }

  async getStorageRules(): Promise<{ [key: string]: any}> {
    return Object.values(await StorageService.get()).filter(rule => typeof rule === 'object' && typeof rule?.name === 'string');
  }

  async getStorageRulesByProperty({ property, value }): Promise<{ [key: string]: any}> {
    const rules = await this.getStorageRules();
    return rules.filter((rule) => rule[property] === value);
  }

  async deleteRule(data): Promise<void> {
    await RuleService.remove([data.rule])
  }

  async deleteRuleById(data): Promise<void> {
    await RuleService.removeById(data.id);
    await StorageService.remove(String(data.id))
  }

  async erase(): Promise<void> {
    await RuleService.erase();
    await StorageService.erase();
  }

  async getUserId(): Promise<any> {
    return await StorageService.getUserId();
  }

}

new ServiceWorker();