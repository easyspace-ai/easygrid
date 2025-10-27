import React, { useState, useCallback } from 'react';
import { cn, tokens, transitions, elevation } from '../../grid/design-system';
import { 
  Eye, 
  EyeOff, 
  GripVertical, 
  MoreHorizontal, 
  Edit3, 
  FolderPlus, 
  Trash2,
  Plus,
  HelpCircle,
  Lock
} from 'lucide-react';

export interface FieldConfig {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked?: boolean;
  required?: boolean;
  description?: string;
}

export interface FieldConfigPanelProps {
  fields: FieldConfig[];
  onFieldToggle: (fieldId: string, visible: boolean) => void;
  onFieldReorder: (fromIndex: number, toIndex: number) => void;
  onFieldEdit: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldGroup: (fieldId: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function FieldConfigPanel({
  fields,
  onFieldToggle,
  onFieldReorder,
  onFieldEdit,
  onFieldDelete,
  onFieldGroup,
  onClose,
  isOpen,
}: FieldConfigPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<string | null>(null);

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedIndex(null);
  }, []);

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // 放置
  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onFieldReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, onFieldReorder]);

  // 获取字段类型图标
  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'number':
        return '🔢';
      case 'singleSelect':
        return '🔘';
      case 'multipleSelect':
        return '☑️';
      case 'date':
        return '📅';
      case 'attachment':
        return '📎';
      case 'checkbox':
        return '☑️';
      default:
        return '📄';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 50,
        }}
        onClick={onClose}
      />

      {/* 字段配置面板 */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          maxHeight: '80vh',
          backgroundColor: tokens.colors.surface.base,
          border: `1px solid ${tokens.colors.border.subtle}`,
          borderRadius: '12px',
          boxShadow: elevation.xl,
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 面板标题 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: tokens.colors.text.primary,
              margin: 0 
            }}>
              字段配置
            </h3>
            <HelpCircle 
              size={16} 
              style={{ color: tokens.colors.text.secondary, cursor: 'help' }} 
            />
          </div>
        </div>

        {/* 字段列表 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {fields.map((field, index) => (
            <div
              key={field.id}
              draggable={!field.locked}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '4px',
                backgroundColor: showContextMenu === field.id 
                  ? tokens.colors.surface.hover 
                  : 'transparent',
                cursor: field.locked ? 'default' : 'grab',
                transition: transitions.presets.all,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!field.locked) {
                  e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (showContextMenu !== field.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* 拖拽手柄 */}
              {!field.locked && (
                <GripVertical 
                  size={16} 
                  style={{ 
                    color: tokens.colors.text.tertiary,
                    marginRight: '8px',
                    cursor: 'grab'
                  }} 
                />
              )}

              {/* 锁定图标 */}
              {field.locked && (
                <Lock 
                  size={16} 
                  style={{ 
                    color: tokens.colors.text.tertiary,
                    marginRight: '8px'
                  }} 
                />
              )}

              {/* 字段图标和名称 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ fontSize: '16px' }}>
                  {getFieldIcon(field.type)}
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  color: tokens.colors.text.primary,
                  fontWeight: field.locked ? 600 : 400 
                }}>
                  {field.name}
                </span>
              </div>

              {/* 显示/隐藏切换 */}
              <button
                onClick={() => onFieldToggle(field.id, !field.visible)}
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '8px',
                  transition: transitions.presets.all,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {field.visible ? (
                  <Eye size={16} style={{ color: tokens.colors.text.primary }} />
                ) : (
                  <EyeOff size={16} style={{ color: tokens.colors.text.tertiary }} />
                )}
              </button>

              {/* 更多操作菜单 */}
              {!field.locked && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowContextMenu(
                      showContextMenu === field.id ? null : field.id
                    )}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: transitions.presets.all,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <MoreHorizontal size={16} style={{ color: tokens.colors.text.secondary }} />
                  </button>

                  {/* 上下文菜单 */}
                  {showContextMenu === field.id && (
                    <>
                      {/* 背景遮罩 */}
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 52,
                        }}
                        onClick={() => setShowContextMenu(null)}
                      />
                      
                      {/* 菜单内容 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: '0',
                          backgroundColor: tokens.colors.surface.base,
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          borderRadius: '6px',
                          boxShadow: elevation.lg,
                          padding: '4px',
                          zIndex: 53,
                          minWidth: '120px',
                        }}
                      >
                        <button
                          onClick={() => {
                            onFieldEdit(field.id);
                            setShowContextMenu(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: tokens.colors.text.primary,
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: transitions.presets.all,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Edit3 size={14} />
                          编辑
                        </button>

                        <button
                          onClick={() => {
                            onFieldGroup(field.id);
                            setShowContextMenu(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: tokens.colors.text.primary,
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: transitions.presets.all,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = tokens.colors.surface.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FolderPlus size={14} />
                          创建编组
                        </button>

                        <button
                          onClick={() => {
                            onFieldDelete(field.id);
                            setShowContextMenu(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: tokens.colors.text.destructive,
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: transitions.presets.all,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = tokens.colors.surface.destructive;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

