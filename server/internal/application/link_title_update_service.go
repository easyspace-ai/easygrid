package application

import (
	"context"
	"encoding/json"
	"fmt"

	linkService "github.com/easyspace-ai/luckdb/server/internal/domain/calculation/link"
	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldValueObject "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/repository"
	recordEntity "github.com/easyspace-ai/luckdb/server/internal/domain/record/entity"
	recordRepo "github.com/easyspace-ai/luckdb/server/internal/domain/record/repository"
	"github.com/easyspace-ai/luckdb/server/internal/domain/record/valueobject"
	"github.com/easyspace-ai/luckdb/server/internal/sharedb"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/easyspace-ai/luckdb/server/pkg/sharedb/opbuilder"
)

// LinkTitleUpdateService 关联字段标题更新服务
// 当关联记录被修改时，自动更新所有引用该记录的 Link 字段的 title
type LinkTitleUpdateService struct {
	linkService   *linkService.LinkService
	fieldRepo     repository.FieldRepository
	recordRepo    recordRepo.RecordRepository
	batchService  *BatchService
	shareDBService *sharedb.ShareDBService // ✨ ShareDB 服务，用于推送更新事件
}

// NewLinkTitleUpdateService 创建关联字段标题更新服务
func NewLinkTitleUpdateService(
	linkService *linkService.LinkService,
	fieldRepo repository.FieldRepository,
	recordRepo recordRepo.RecordRepository,
	batchService *BatchService,
	shareDBService *sharedb.ShareDBService, // ✨ 添加 ShareDB 服务参数（可以为 nil，稍后设置）
) *LinkTitleUpdateService {
	return &LinkTitleUpdateService{
		linkService:    linkService,
		fieldRepo:      fieldRepo,
		recordRepo:     recordRepo,
		batchService:   batchService,
		shareDBService: shareDBService, // ✨ 保存 ShareDB 服务
	}
}

// SetShareDBService 设置 ShareDB 服务（用于延迟注入）
func (s *LinkTitleUpdateService) SetShareDBService(shareDBService *sharedb.ShareDBService) {
	s.shareDBService = shareDBService
	logger.Info("✅ LinkTitleUpdateService ShareDB 服务已设置")
}

// UpdateLinkTitlesForRecord 更新引用指定记录的所有 Link 字段的 title
// 当记录更新时调用此方法，自动更新所有引用该记录的 Link 字段的 title
func (s *LinkTitleUpdateService) UpdateLinkTitlesForRecord(
	ctx context.Context,
	tableID string,
	recordID string,
	updatedRecord *recordEntity.Record,
) error {
	if updatedRecord == nil {
		return nil
	}

	logger.Info("🔵 开始更新 Link 字段标题",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.Bool("updated_record_is_nil", updatedRecord == nil))

	// 入口参数与源记录概览
	preview := updatedRecord.Data().ToMap()
	logger.Info("UpdateLinkTitlesForRecord: 入参预览",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.Int("data_keys_count", len(preview)),
		logger.Any("data_keys", getMapKeys(preview)),
	)

	// 1. 使用 GetAffectedRecordsByLink 查找所有引用该记录的 Link 字段所在的记录
	logger.Info("🔵 开始查找受影响的记录",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.String("field_id", ""), // fieldID 为空，查找所有引用该表的 Link 字段
		logger.Int("record_ids_count", 1))
	
	affectedRecords, err := s.linkService.GetAffectedRecordsByLink(
		ctx,
		tableID,
		"", // fieldID 为空，查找所有引用该表的 Link 字段
		[]string{recordID},
	)
	if err != nil {
		logger.Error("❌ 查找受影响的记录失败",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.ErrorField(err))
		return fmt.Errorf("查找受影响的记录失败: %w", err)
	}

	if len(affectedRecords) == 0 {
		logger.Info("⚠️ 没有找到受影响的记录（没有其他表引用此记录）",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.String("reason", "GetAffectedRecordsByLink 返回空结果"))
		return nil
	}

	logger.Info("✅ 找到受影响的记录",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.Int("affected_table_count", len(affectedRecords)),
		logger.Any("affected_tables", affectedRecords))
	
	// ✅ 详细记录每个受影响的表
	for targetTableID, targetRecordIDs := range affectedRecords {
		logger.Info("📋 受影响的表详情",
			logger.String("source_table_id", tableID),
			logger.String("source_record_id", recordID),
			logger.String("target_table_id", targetTableID),
			logger.Int("target_record_count", len(targetRecordIDs)),
			logger.Any("target_record_ids", targetRecordIDs))
	}

	// 2. 获取更新后的记录数据
	updatedRecordData := updatedRecord.Data().ToMap()
	
	// ✅ 添加调试日志：记录源记录数据
	logger.Info("UpdateLinkTitlesForRecord: 源记录数据",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID),
		logger.Any("record_data", updatedRecordData),
		logger.Any("data_keys", getMapKeys(updatedRecordData)))

	// 3. 对于每个受影响的表，更新 Link 字段的 title
	for targetTableID, targetRecordIDs := range affectedRecords {
		if err := s.updateLinkTitlesForTable(
			ctx,
			targetTableID,
			targetRecordIDs,
			tableID,
			recordID,
			updatedRecordData,
		); err != nil {
			logger.Error("更新表 Link 字段标题失败",
				logger.String("target_table_id", targetTableID),
				logger.String("source_table_id", tableID),
				logger.String("source_record_id", recordID),
				logger.ErrorField(err))
			// 继续处理其他表，不中断
			continue
		}
	}

	logger.Info("✅ Link 字段标题更新完成",
		logger.String("table_id", tableID),
		logger.String("record_id", recordID))

	return nil
}

// updateLinkTitlesForTable 更新指定表中 Link 字段的 title
func (s *LinkTitleUpdateService) updateLinkTitlesForTable(
	ctx context.Context,
	targetTableID string,
	targetRecordIDs []string,
	sourceTableID string,
	sourceRecordID string,
	sourceRecordData map[string]interface{},
) error {
	if len(targetRecordIDs) == 0 {
		return nil
	}

	logger.Info("更新表 Link 字段标题",
		logger.String("target_table_id", targetTableID),
		logger.String("source_table_id", sourceTableID),
		logger.String("source_record_id", sourceRecordID),
		logger.Int("target_record_count", len(targetRecordIDs)))

	// 1. 查找所有指向 sourceTableID 的 Link 字段
	linkFields, err := s.fieldRepo.FindLinkFieldsToTable(ctx, sourceTableID)
	if err != nil {
		return fmt.Errorf("查找 Link 字段失败: %w", err)
	}

	if len(linkFields) == 0 {
		logger.Debug("没有找到指向源表的 Link 字段",
			logger.String("target_table_id", targetTableID),
			logger.String("source_table_id", sourceTableID))
		return nil
	}

	// 2. 过滤出属于 targetTableID 的 Link 字段
	targetLinkFields := make([]*fieldEntity.Field, 0)
	for _, linkField := range linkFields {
		if linkField.TableID() == targetTableID {
			targetLinkFields = append(targetLinkFields, linkField)
		}
	}

	if len(targetLinkFields) == 0 {
		logger.Debug("目标表中没有指向源表的 Link 字段",
			logger.String("target_table_id", targetTableID),
			logger.String("source_table_id", sourceTableID))
		return nil
	}

	// 3. 对于每个 Link 字段，更新引用 sourceRecordID 的记录
	for _, linkField := range targetLinkFields {
		if err := s.updateLinkFieldTitles(
			ctx,
			targetTableID,
			targetRecordIDs,
			linkField,
			sourceTableID,
			sourceRecordID,
			sourceRecordData,
		); err != nil {
			logger.Error("更新 Link 字段标题失败",
				logger.String("link_field_id", linkField.ID().String()),
				logger.String("target_table_id", targetTableID),
				logger.ErrorField(err))
			// 继续处理其他字段，不中断
			continue
		}
	}

	return nil
}

// updateLinkFieldTitles 更新指定 Link 字段的 title
func (s *LinkTitleUpdateService) updateLinkFieldTitles(
	ctx context.Context,
	targetTableID string,
	targetRecordIDs []string,
	linkField *fieldEntity.Field,
	sourceTableID string,
	sourceRecordID string,
	sourceRecordData map[string]interface{},
) error {
	// 1. 获取 Link 字段的 lookupFieldId
	linkOptions := linkField.Options()
	if linkOptions == nil || linkOptions.Link == nil {
		logger.Error("Link 字段选项为空",
			logger.String("link_field_id", linkField.ID().String()),
			logger.String("target_table_id", targetTableID))
		return fmt.Errorf("Link 字段选项为空")
	}

	// 从 Link 选项或 Lookup 选项中获取 lookupFieldID
	lookupFieldID := linkOptions.Link.LookupFieldID
	if lookupFieldID == "" && linkOptions.Lookup != nil {
		lookupFieldID = linkOptions.Lookup.LookupFieldID
	}
	
	logger.Info("查找 lookupFieldID：从 Link 选项获取",
		logger.String("source_table_id", sourceTableID),
		logger.String("link_field_id", linkField.ID().String()),
		logger.String("lookup_field_id_from_options", lookupFieldID),
		logger.Bool("has_link_options", linkOptions.Link != nil),
		logger.Bool("has_lookup_options", linkOptions.Lookup != nil),
		logger.String("linked_table_id", linkOptions.Link.LinkedTableID),
		logger.String("relationship", linkOptions.Link.Relationship))
	
	if lookupFieldID == "" {
		// 如果没有指定 lookupFieldID，使用主字段（第一个字段）
		fields, err := s.fieldRepo.FindByTableID(ctx, sourceTableID)
		if err != nil {
			logger.Error("查找源表字段失败",
				logger.String("source_table_id", sourceTableID),
				logger.ErrorField(err))
			return fmt.Errorf("查找源表字段失败: %w", err)
		}
		if len(fields) == 0 {
			logger.Error("源表没有字段",
				logger.String("source_table_id", sourceTableID))
			return fmt.Errorf("源表没有字段")
		}
		
		logger.Info("查找 lookupFieldID：源表字段列表",
			logger.String("source_table_id", sourceTableID),
			logger.Int("field_count", len(fields)))
		
		// 查找第一个非虚拟字段
		for i, field := range fields {
			fieldType := field.Type().String()
			isVirtual := isVirtualField(fieldType)
			logger.Info("检查字段是否为虚拟字段",
				logger.String("source_table_id", sourceTableID),
				logger.Int("field_index", i),
				logger.String("field_id", field.ID().String()),
				logger.String("field_name", field.Name().String()),
				logger.String("field_type", fieldType),
				logger.Bool("is_virtual", isVirtual))
			
			if !isVirtual {
				lookupFieldID = field.ID().String()
				logger.Info("找到第一个非虚拟字段作为 lookupFieldID",
					logger.String("source_table_id", sourceTableID),
					logger.String("lookup_field_id", lookupFieldID),
					logger.String("field_name", field.Name().String()))
				break
			}
		}
		// 如果没有非虚拟字段，使用第一个字段
		if lookupFieldID == "" && len(fields) > 0 {
			lookupFieldID = fields[0].ID().String()
			logger.Info("使用第一个字段作为 lookupFieldID（所有字段都是虚拟字段）",
				logger.String("source_table_id", sourceTableID),
				logger.String("lookup_field_id", lookupFieldID),
				logger.String("field_name", fields[0].Name().String()))
		}
	}

	if lookupFieldID == "" {
		logger.Error("无法确定 lookupFieldID",
			logger.String("source_table_id", sourceTableID),
			logger.String("link_field_id", linkField.ID().String()),
			logger.String("target_table_id", targetTableID),
			logger.Any("source_record_data_keys", getMapKeys(sourceRecordData)))
		return fmt.Errorf("无法确定 lookupFieldID")
	}

	// 2. 从源记录中提取 lookupFieldID 字段的最新值作为新的 title
	// ✅ 添加调试日志：记录查找过程
	logger.Info("updateLinkFieldTitles: 查找 lookupFieldID 的值",
		logger.String("source_table_id", sourceTableID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("lookup_field_id", lookupFieldID),
		logger.Any("source_record_data", sourceRecordData),
		logger.Any("data_keys", getMapKeys(sourceRecordData)))
	
	// ✅ 关键修复：优先使用字段名查找（因为字段名的值可能是最新的），如果不存在，再使用字段 ID
	// 获取字段信息，找到字段名
	fieldIDVO := fieldValueObject.NewFieldID(lookupFieldID)
	lookupField, err := s.fieldRepo.FindByID(ctx, fieldIDVO)
	var fieldName string
	if err == nil && lookupField != nil {
		fieldName = lookupField.Name().String()
	}
	
	// 优先使用字段名查找（因为字段名的值可能是最新的）
	var titleByFieldID, titleByFieldName interface{}
	var existsByFieldID, existsByFieldName bool
	var newTitle interface{}
	var exists bool
	
	if fieldName != "" {
		titleByFieldName, existsByFieldName = sourceRecordData[fieldName]
	}
	titleByFieldID, existsByFieldID = sourceRecordData[lookupFieldID]
	
	// 如果字段名存在，优先使用字段名的值（因为字段名的值可能是最新的）
	if existsByFieldName {
		newTitle = titleByFieldName
		exists = true
		logger.Info("通过字段名找到 lookupFieldID 的值（优先使用字段名）",
			logger.String("lookup_field_id", lookupFieldID),
			logger.String("field_name", fieldName),
			logger.Any("value", newTitle))
	} else if existsByFieldID {
		newTitle = titleByFieldID
		exists = true
		logger.Info("通过字段 ID 找到 lookupFieldID 的值",
			logger.String("lookup_field_id", lookupFieldID),
			logger.Any("value", newTitle))
	} else {
		logger.Warn("源记录中没有 lookupFieldID 字段（字段 ID 和字段名都不存在）",
			logger.String("lookup_field_id", lookupFieldID),
			logger.String("field_name", fieldName),
			logger.String("source_record_id", sourceRecordID),
			logger.Any("available_keys", getMapKeys(sourceRecordData)))
		newTitle = ""
		exists = false
	}

	titleStr := fmt.Sprintf("%v", newTitle)
	
	// ✅ 添加调试日志：记录提取的 title
	logger.Info("updateLinkFieldTitles: 提取的 title",
		logger.String("source_table_id", sourceTableID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("lookup_field_id", lookupFieldID),
		logger.String("new_title", titleStr),
		logger.Bool("exists", exists))

	logger.Info("🔵 准备更新 Link 字段标题",
		logger.String("link_field_id", linkField.ID().String()),
		logger.String("link_field_name", linkField.Name().String()),
		logger.String("target_table_id", targetTableID),
		logger.String("source_table_id", sourceTableID),
		logger.String("source_record_id", sourceRecordID),
		logger.String("lookup_field_id", lookupFieldID),
		logger.String("new_title", titleStr),
		logger.Bool("title_exists", exists),
		logger.Int("target_record_count", len(targetRecordIDs)))

	// 3. ✨ 使用批量更新接口直接更新 JSONB 字段（性能优化）
	// 使用 jsonb_set 函数直接更新，避免读取整个记录
	linkFieldID := linkField.ID().String()
	if err := s.recordRepo.BatchUpdateLinkFieldTitle(
		ctx,
		targetTableID,
		linkFieldID,
		sourceRecordID,
		titleStr,
	); err != nil {
		logger.Error("批量更新 Link 字段标题失败",
			logger.String("link_field_id", linkFieldID),
			logger.String("target_table_id", targetTableID),
			logger.String("source_record_id", sourceRecordID),
			logger.ErrorField(err))
		return fmt.Errorf("批量更新 Link 字段标题失败: %w", err)
	}

	// 4. ✨ 推送 ShareDB 事件，通知前端数据已更新
	// 注意：由于使用了批量更新，我们需要查询更新的记录来推送事件
	if s.shareDBService != nil && len(targetRecordIDs) > 0 {
		logger.Info("🔵 准备构建 ShareDB 事件更新列表",
			logger.String("target_table_id", targetTableID),
			logger.String("link_field_id", linkFieldID),
			logger.Int("target_record_count", len(targetRecordIDs)))
		
		// 使用已知的 targetRecordIDs 构建更新列表用于推送 ShareDB 事件
		updates := make([]RecordUpdate, 0, len(targetRecordIDs))
		for _, recordID := range targetRecordIDs {
			// 查询记录获取最新的 Link 字段值（批量更新后的值）
			recordIDVO := valueobject.NewRecordID(recordID)
			record, err := s.recordRepo.FindByTableAndID(ctx, targetTableID, recordIDVO)
			if err != nil || record == nil {
				logger.Warn("无法查询记录以构建 ShareDB 事件",
					logger.String("target_table_id", targetTableID),
					logger.String("record_id", recordID),
					logger.ErrorField(err))
				continue
			}
			recordData := record.Data().ToMap()
			linkValue := recordData[linkFieldID]
			if linkValue != nil {
				updates = append(updates, RecordUpdate{
					TableID:      targetTableID,
					RecordID:     recordID,
					FieldUpdates: map[string]interface{}{linkFieldID: linkValue},
				})
				logger.Debug("已添加记录到 ShareDB 事件更新列表",
					logger.String("target_table_id", targetTableID),
					logger.String("record_id", recordID),
					logger.Any("link_value", linkValue))
			} else {
				logger.Warn("记录中没有 Link 字段值",
					logger.String("target_table_id", targetTableID),
					logger.String("record_id", recordID),
					logger.String("link_field_id", linkFieldID))
			}
		}

		if len(updates) > 0 {
			logger.Info("🔵 准备推送 ShareDB 事件",
				logger.String("target_table_id", targetTableID),
				logger.Int("update_count", len(updates)))
			if err := s.publishShareDBEvents(ctx, targetTableID, updates); err != nil {
				logger.Warn("推送 ShareDB 事件失败（不影响数据更新）",
					logger.String("target_table_id", targetTableID),
					logger.ErrorField(err))
				// 不中断主流程，只记录警告
			} else {
				logger.Info("✅ ShareDB 事件推送成功",
					logger.String("target_table_id", targetTableID),
					logger.Int("update_count", len(updates)))
			}
		} else {
			logger.Warn("⚠️ 没有需要推送的 ShareDB 事件（updates 为空）",
				logger.String("target_table_id", targetTableID),
				logger.Int("target_record_count", len(targetRecordIDs)))
		}
	}

	logger.Info("✅ Link 字段标题更新成功",
		logger.String("link_field_id", linkFieldID),
		logger.String("target_table_id", targetTableID),
		logger.String("source_record_id", sourceRecordID),
		logger.Int("target_record_count", len(targetRecordIDs)))

	return nil
}

// publishShareDBEvents 推送 ShareDB 事件，通知前端记录已更新
func (s *LinkTitleUpdateService) publishShareDBEvents(
	ctx context.Context,
	tableID string,
	updates []RecordUpdate,
) error {
	if len(updates) == 0 {
		return nil
	}

	collection := fmt.Sprintf("rec_%s", tableID)

	// 为每个更新的记录推送 ShareDB 事件
	for _, update := range updates {
		// 构建 ShareDB 操作（使用 sharedb.OTOperation 类型）
		operations := make([]sharedb.OTOperation, 0)

		// 为每个字段变化创建 OT 操作
		// 注意：ShareDB 文档结构是 { data: { fieldId: value } }，所以路径应该是 ["data", fieldID]
		for fieldID, fieldValue := range update.FieldUpdates {
			operation := sharedb.OTOperation{
				"p":  []interface{}{"data", fieldID}, // path: ["data", fieldID] - 与前端 submitFieldUpdate 保持一致
				"oi": fieldValue,                       // object insert: new value
			}
			operations = append(operations, operation)
		}

		if len(operations) == 0 {
			continue
		}

		// 转换为 opbuilder.Operation 类型
		// 注意：Path 格式应该是 []interface{}{operations}，与 RecordService 保持一致
		opBuilderOp := &opbuilder.Operation{
			Path:     []interface{}{operations},
			OldValue: nil,
			NewValue: nil,
			Type:     opbuilder.OpTypeSet,
		}

		// 发布到 ShareDB
		logger.Info("🔵 推送 ShareDB 事件",
			logger.String("table_id", tableID),
			logger.String("collection", collection),
			logger.String("record_id", update.RecordID),
			logger.Int("operations_count", len(operations)),
			logger.Any("field_updates", update.FieldUpdates))
		
		if err := s.shareDBService.PublishOp(ctx, collection, update.RecordID, opBuilderOp); err != nil {
			logger.Error("推送 ShareDB 事件失败",
				logger.String("table_id", tableID),
				logger.String("collection", collection),
				logger.String("record_id", update.RecordID),
				logger.ErrorField(err))
			// 继续处理其他记录，不中断
			continue
		}

		logger.Info("✅ ShareDB 事件已推送",
			logger.String("table_id", tableID),
			logger.String("collection", collection),
			logger.String("record_id", update.RecordID),
			logger.Int("operations_count", len(operations)))
	}

	return nil
}

// updateLinkValueTitle 更新 Link 字段值中的 title
// linkValue 可能是单个对象 {id: "xxx", title: "yyy"} 或数组 [{id: "xxx", title: "yyy"}, ...]
func (s *LinkTitleUpdateService) updateLinkValueTitle(
	linkValue interface{},
	targetRecordID string,
	newTitle string,
) (interface{}, bool) {
	if linkValue == nil {
		return nil, false
	}

	// 处理数组类型
	if linkArray, ok := linkValue.([]interface{}); ok {
		updated := false
		updatedArray := make([]interface{}, len(linkArray))
		for i, item := range linkArray {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if id, ok := itemMap["id"].(string); ok && id == targetRecordID {
					// 找到目标记录，更新 title
					updatedItem := make(map[string]interface{})
					for k, v := range itemMap {
						updatedItem[k] = v
					}
					updatedItem["id"] = targetRecordID
					updatedItem["title"] = newTitle
					updatedArray[i] = updatedItem
					updated = true
				} else {
					updatedArray[i] = item
				}
			} else {
				updatedArray[i] = item
			}
		}
		return updatedArray, updated
	}

	// 处理单个对象类型
	if linkMap, ok := linkValue.(map[string]interface{}); ok {
		if id, ok := linkMap["id"].(string); ok && id == targetRecordID {
			// 找到目标记录，更新 title
			updatedMap := make(map[string]interface{})
			for k, v := range linkMap {
				updatedMap[k] = v
			}
			updatedMap["id"] = targetRecordID
			updatedMap["title"] = newTitle
			return updatedMap, true
		}
	}

	// 处理 JSONB 反序列化后的类型（可能是 []byte 或 string）
	if jsonBytes, ok := linkValue.([]byte); ok {
		var result interface{}
		if err := json.Unmarshal(jsonBytes, &result); err == nil {
			updatedValue, updated := s.updateLinkValueTitle(result, targetRecordID, newTitle)
			if updated {
				return updatedValue, true
			}
		}
	}

	if jsonStr, ok := linkValue.(string); ok {
		var result interface{}
		if err := json.Unmarshal([]byte(jsonStr), &result); err == nil {
			updatedValue, updated := s.updateLinkValueTitle(result, targetRecordID, newTitle)
			if updated {
				return updatedValue, true
			}
		}
	}

	return linkValue, false
}

// convertStringIDsToRecordIDs 将字符串ID列表转换为RecordID列表
func convertStringIDsToRecordIDs(ids []string) []valueobject.RecordID {
	result := make([]valueobject.RecordID, len(ids))
	for i, id := range ids {
		result[i] = valueobject.NewRecordID(id)
	}
	return result
}

// isVirtualField 检查字段类型是否为虚拟字段
func isVirtualField(fieldType string) bool {
	switch fieldType {
	case "formula", "rollup", "lookup", "ai":
		return true
	default:
		return false
	}
}

// getMapKeys 获取 map 的所有键（辅助函数）
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

