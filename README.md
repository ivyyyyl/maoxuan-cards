# 遇事不决问毛选

一个用摄像头手势抽语录牌的网页应用：左划、右划选择卡牌，拇指与食指收拢抽牌。卡牌内容为 100 条带出处、原文选段和解读的毛选语录，主题是"遇事不决问毛选"。翻牌后还能一键复制深度解读 Prompt，交给任意 agent 继续对话。

## 运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。摄像头授权后即可使用手势；没有摄像头时可以用鼠标、箭头键和回车完成全部操作。

## 脚本

```bash
npm test        # 单元测试
npm run build   # 类型检查 + 生产构建
```

## 目录

```text
src/
  components/   界面组件
  data/         语录数据
  engine/       手势识别逻辑
  hooks/        摄像头与 MediaPipe 集成
public/
  mediapipe-hands/  本地手部模型与 wasm
docs/
  PROJECT_PLAN.md    技术选型、交互、视觉、任务与测试方案
```

## 数据说明

语录数据位于 `src/data/quotes.ts`，每条包含原文、出处、原文选段、解读与标签；Prompt 模板位于 `src/data/prompt.ts`。详细的产品与技术方案见 [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)。
