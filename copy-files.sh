#!/bin/bash

# 複製所有必要的文件從 FigmaCode 資料夾到根目錄

SOURCE_DIR="FigmaCode_群呼分析儀表板"
TARGET_DIR="."

# 複製組件文件
echo "複製組件文件..."
cp -r "$SOURCE_DIR/src/components" "$TARGET_DIR/src/"

# 複製工具文件
echo "複製工具文件..."
cp -r "$SOURCE_DIR/src/utils" "$TARGET_DIR/src/"

# 複製樣式文件
echo "複製樣式文件..."
cp "$SOURCE_DIR/src/index.css" "$TARGET_DIR/src/"

echo "完成！所有文件已複製。"


