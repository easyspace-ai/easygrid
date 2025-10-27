/**
 * Filter Factory
 * 根据字段类型创建对应的过滤器实例
 */

import type { Field } from '../field/Field';
import type { BaseFilter, IFilterConfig } from './BaseFilter';
import { TextFilter } from './TextFilter';
import { NumberFilter } from './NumberFilter';
import { BooleanFilter } from './BooleanFilter';
import { SelectFilter } from './SelectFilter';
import { DateFilter } from './DateFilter';
import { LinkFilter } from './LinkFilter';
import { UserFilter } from './UserFilter';
import { AttachmentFilter } from './AttachmentFilter';
import { RatingFilter } from './RatingFilter';
import { FieldType } from '../../types/field';

export function createFilterInstance(
  field: Field,
  config: IFilterConfig
): BaseFilter {
  switch (field.type) {
    case FieldType.SingleLineText:
    case FieldType.LongText:
      return new TextFilter(field, config);
    
    case FieldType.Number:
      return new NumberFilter(field, config);
    
    case FieldType.Checkbox:
      return new BooleanFilter(field, config);
    
    case FieldType.SingleSelect:
    case FieldType.MultipleSelect:
      return new SelectFilter(field, config);
    
    case FieldType.Date:
    case FieldType.CreatedTime:
    case FieldType.LastModifiedTime:
      return new DateFilter(field, config);
    
    case FieldType.Link:
      return new LinkFilter(field, config);
    
    case FieldType.User:
    case FieldType.CreatedBy:
    case FieldType.LastModifiedBy:
      return new UserFilter(field, config);
    
    case FieldType.Attachment:
      return new AttachmentFilter(field, config);
    
    case FieldType.Rating:
      return new RatingFilter(field, config);
    
    // Formula 和 Rollup 字段根据其返回类型创建过滤器
    case FieldType.Formula:
    case FieldType.Rollup:
      // 这里可以根据字段的 options.returnType 来决定使用哪个过滤器
      // 暂时默认使用文本过滤器
      return new TextFilter(field, config);
    
    default:
      // 默认使用文本过滤器
      return new TextFilter(field, config);
  }
}


