import React from 'react';
import { FormMode, IRule, IRuleData } from 'src/models/formFieldModel';
import ColorCover from 'src/options/components/common/colorCover/colorCover';
import Form from 'src/options/components/common/form/form';
import FormBuilder from 'src/options/formBuilder/formBuilder';
import config from 'src/options/formBuilder/config';
import { PropsWithChildren } from 'src/types';
import { FormError } from 'src/options/HOC/formHOC';

type Props = PropsWithChildren<{
    onDelete: Function,
    onSave: Function,
    onChange: Function,
    setRuleData: Function,
    template: boolean,
    mode: FormMode,
    pageType: string,
    error: FormError,
    ruleData: IRuleData,
  }>

const Forms = ({ children, ...props }: Props) => {
    const { onDelete, onSave, mode, error, pageType, ruleData, setRuleData, template, onChange } = props;
    const { generateRule } = config[pageType];

    const onSubmit = () => {
        const form: IRule = generateRule(ruleData);
        onSave(form);
    };

    return <ColorCover classes="mx-[5%] p-5">
            <Form onDelete={onDelete} onSubmit={onSubmit} mode={mode} error={error} pageType={pageType}>
                <FormBuilder
                    ruleData={ruleData}
                    setRuleData={setRuleData}
                    onChange={onChange}
                    error={error}
                    mode={mode}
                    pageType={pageType}
                    template={template}
                />
            </Form>
        </ColorCover>
}

export default Forms;