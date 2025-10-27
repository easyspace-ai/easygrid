package main

import (
	"fmt"
	"strings"

	"github.com/easyspace-ai/luckdb/server/internal/sharedb"
)

// 测试 ParseCollection 函数
func main() {
	fmt.Println("🧪 测试 ParseCollection 函数")
	fmt.Println("==========================")

	collection := "rec_tbl_oz9EbQgbTZBuF7FSSJvet"
	
	fmt.Printf("输入集合: %s\n", collection)
	
	// 模拟 ParseCollection 逻辑
	parts := strings.Split(collection, "_")
	fmt.Printf("分割结果: %v\n", parts)
	
	if len(parts) < 2 {
		fmt.Println("❌ 分割后少于2部分")
		return
	}
	
	docType := sharedb.DocumentType(parts[0])
	fmt.Printf("原始 docType: %s\n", docType)
	
	if docType == "rec" {
		docType = sharedb.DocumentTypeRecord
		fmt.Printf("转换后 docType: %s\n", docType)
	}
	
	fmt.Printf("DocumentTypeRecord: %s\n", sharedb.DocumentTypeRecord)
	fmt.Printf("是否相等: %t\n", docType == sharedb.DocumentTypeRecord)
	
	// 调用实际的 ParseCollection
	info := sharedb.ParseCollection(collection)
	fmt.Printf("ParseCollection 结果: %+v\n", info)
}
