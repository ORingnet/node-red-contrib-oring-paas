import {
  object,
  string,
  mixed,
  array,
} from 'yup';

export const idValueSchema = object().shape({
  id: string().required(),
  value: mixed().required(),
  timestamp: mixed().test(
    'is-valid-date',
    '${path} is invalid date',
    (value) => {
      if (typeof value === 'undefined') {
        return true;
      }

      return !Number.isNaN(new Date(value).getTime());
    },
  ).notRequired(),
});

export const idValueArraySchema = array().of(idValueSchema);
