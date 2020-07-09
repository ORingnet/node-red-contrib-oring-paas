import {
  object,
  string,
  number,
  array,
  mixed,
} from 'yup';

export const dataPointSchema = object().shape({
  timestamp: number().required(),
  values: array().of(
    object().shape({
      id: string().required(),
      value: mixed().required(),
    }),
  ),
});
