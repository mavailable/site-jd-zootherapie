import type { CmsField } from '../../../../cms.types';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { DateField } from './DateField';
import { SelectField } from './SelectField';
import { MultiselectField } from './MultiselectField';
import { ImageField } from './ImageField';
import { ObjectField } from './ObjectField';
import { ArrayField } from './ArrayField';
import { RichTextField } from './RichTextField';

interface FieldRendererProps {
  field: CmsField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return (
        <TextField
          field={field}
          value={value as string}
          onChange={onChange}
        />
      );

    case 'richtext':
      return (
        <RichTextField
          field={field}
          value={value as string}
          onChange={onChange}
        />
      );

    case 'number':
      return (
        <NumberField
          field={field}
          value={value as number}
          onChange={onChange}
        />
      );

    case 'date':
      return (
        <DateField
          field={field}
          value={value as string}
          onChange={onChange}
        />
      );

    case 'select':
      return (
        <SelectField
          field={field}
          value={value as string}
          onChange={onChange}
        />
      );

    case 'multiselect':
      return (
        <MultiselectField
          field={field}
          value={value as string[]}
          onChange={onChange as (value: string[]) => void}
        />
      );

    case 'image':
      return (
        <ImageField
          field={field}
          value={value as string}
          onChange={onChange}
        />
      );

    case 'object':
      return (
        <ObjectField
          field={field}
          value={value as Record<string, unknown>}
          onChange={onChange as (value: Record<string, unknown>) => void}
        />
      );

    case 'array':
      return (
        <ArrayField
          field={field}
          value={value as unknown[]}
          onChange={onChange as (value: unknown[]) => void}
        />
      );

    default:
      return <div>Type de champ inconnu : {(field as CmsField).type}</div>;
  }
}
