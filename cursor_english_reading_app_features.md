# English reading app features
_Exported on 4/25/2026 at 17:14:21 GMT+8 from Cursor (3.0.12)_

---

**User**

帮我写一个英语阅读的app，实现功能：
1、允许用户导入英语文章，可以是word、PDF、图片，也可以是链接。你要读取这些内容里的文本，给用户确认后完成导入。确认文本时可以允许用户批量调整要导入的内容，这个环节请设计一个灵活的选择器。
2、文章导入完成后，用阅读友好的界面呈现出来，便于长文本阅读
3、用户选中词或词组时，在页面浮窗给出：翻译、引申义、例句、词根来源
选中句子时，给出翻译，并给一个语法分析按钮，允许用户学习其中的语法形式
无论词或句子，都提供收藏按钮，且收藏夹内提供关联上下文，这样用户能随时复现词句收藏时的场景

---

**Cursor**

正在创建一个功能完整的英语阅读 Web 应用：先搭建项目结构并实现核心功能。



修复阅读视图与原文偏移对齐：用单一 `pre-wrap` 容器承载全文，便于准确计算选中位置。



改进导入向导：在确认步骤点“取消”时返回来源选择，而非关闭整个弹窗。



已在本地搭好一个可运行的 **英语阅读 Web 应用**，路径：`/Users/xi/english-reader`。

## 功能概览

1. **导入**  
   - **Word (.docx)**：`mammoth` 抽纯文本。  
   - **PDF**：`pdf.js` 按页拼文本。  
   - **图片**：`tesseract.js` 英文 OCR（首次会加载语言包，稍慢）。  
   - **链接**：通过 `https://r.jina.ai/` 阅读器抓取正文（免自己处理 CORS；个别站点可能失败，可改用「粘贴」）。  
   - **粘贴**：任意英文正文。  
   - 提取后进入 **确认 / 裁剪** 界面：`TextConfirmSelector` 支持按段勾选、全选/取消可见/反选、奇偶段、段落顺序反转、关键字筛选高亮、**全文编辑模式** 直接改合并结果，再「确认导入」。

2. **阅读**  
   - 文库列表；打开后为 **Crimson Pro + 合适行宽与 `pre-wrap`** 的纸感阅读区，工具栏可返回、**导入**、打开收藏夹。

3. **划选**  
   - **短选**（启发式：较短、不像整句）→ 侧栏浮层：**整段中文翻译**（MyMemory 免费接口）、**Free Dictionary API**：释义/例句、**词源**（有则显示）、词组时说明词典针对首词。  
   - **长选 / 句级** → 同样翻译 + **「生成语法讲解」**（需配置 OpenAI，见下）。  
   - 均带 **上下文摘录**（选中部分用 `【】` 标出）。  
   - **收藏**：写入 `localStorage`，收藏夹里展示 **原文、译文、可选语法笔记、关联上下文、文章名**，并可 **打开原文** 或删除。

## 语法分析（OpenAI）

在项目根目录新建 `.env`（勿提交仓库）：

```bash
VITE_OPENAI_API_KEY=sk-...
```

然后重新执行 `npm run dev` / `npm run build`。未配置时按钮会提示如何设置。

## 本地运行

```bash
cd /Users/xi/english-reader
npm run dev
```

浏览器打开终端里提示的本地地址即可。

## 说明与限制

- **翻译 / 词典 / 网页抓取** 依赖外网与第三方配额，可能偶发失败或限流。  
- **词典词源** 依赖数据源字段，很多词没有 `origin`。  
- 首包较大（含 PDF worker、OCR）；若以后要优化可做按需 `import()` 分包。

若你希望下一步做成 **PWA 离线**、**服务端统一代理翻译**、或 **划选改为内联气泡而非侧栏**，可以说明偏好我继续改一版交互与架构。

---

**User**

修改：
1、阅读器界面可以再宽一点，自适应Web端
2、选中后默认内联气泡（可以滚动气泡查看长内容），也设置弹出侧边栏展开的选项
3、文章导入界面，在选择导入哪些文本的那个界面，也呈现导入的原始文件，随当前滚动的文本位置对应匹配原始文档的位置。另外，文章导入后支持修改
4、应用名称改成“Satie Reader”，并为我加上一个具有设计感的单色微渐变简约icon
5、首页加上收藏夹、回收站入口
6、收藏夹功能：
默认视图：按列表呈现收藏的词句，可以按收藏时间排序、按首字母排序，点击之后可以看到翻译例句词根等（同查询时的要求），还可以移除单词
另外增加：按收藏文章来源呈现的视图，底下关联在这篇文章里收藏的词句

---

**Cursor**

正在读取当前代码结构以实现这些改动。



正在实现：先更新类型与提取逻辑，再添加共享的 `LookupBody`、气泡/侧边栏、导入双栏同步、收藏夹与回收站。



移除 `LookupBody` 内的重复标题栏，由各容器负责顶栏。



正在更新 `ImportWizard` 与 `ReaderView`，并添加 `TrashDrawer`、重写 `FavoritesDrawer`。



以下为本次已落地的改动摘要。

## 1. 阅读区更宽、自适应
- `.reader-layout-wide` 将正文区域放宽到约 **min(56rem, 92vw)**，并配合横向 `clamp` 内边距。

## 2. 划选释义：默认气泡 + 可选侧栏
- 默认使用 **固定定位气泡**（`.snippet-bubble`），内容区可滚动；半透明层点击可关闭。
- 气泡工具栏有 **「侧边栏」**，侧栏标题栏有 **「气泡模式」**，并写入本地偏好（`satie-reader-lookup-ui`）。
- 首次进入若偏好为侧栏，则直接 **右侧抽屉式侧栏**（与原逻辑一致）。

## 3. 导入确认：原文对照 + 滚动联动 + 编辑文章
- 确认页改为 **三列**：抽取段落 / **原始文件预览** / 合并预览。  
  - Word：`mammoth.convertToHtml` 在 iframe 中展示。  
  - PDF / 图片：blob URL 在 iframe 或滚动区域内展示。  
  - 链接 / 粘贴：右侧为同原文本的 `pre`。  
- 左右（及 html iframe 内文档）用 **滚动比例** 互相同步；PDF 受浏览器内嵌阅读器限制，说明里已提示可能略有偏差。  
- 标题旁增加 **「退出导入」**。  
- 阅读器工具栏增加 **「编辑」**：可改标题与正文，**保存** 后写回列表与收藏里该文的标题。

## 4. 品牌：Satie Reader + 图标
- 应用名改为 **Satie Reader**（`index.html` 标题与首页）。  
- 新增 `public/satie-icon.svg`：灰阶微渐变、线条 + 一笔装饰，用作 **favicon** 与首页头像。

## 5. 首页入口
- 主导航：**导入文章**、**收藏夹**、**回收站**（后两项带数量角标，有数据时显示）。

## 6. 收藏夹
- **列表**：可切换排序 **收藏时间** / **首字母（按英文原文 `localeCompare`）**；点击行进入 **详情侧栏**，复用与划选相同的 **翻译 / 例句与释义 / 词源 / 语法**（`LookupBody`，并传入已缓存的译文、语法笔记作初值，同时仍会向服务器刷新一次）。  
- **按文章**：按文章聚合，可 **打开文章**，条目点击同样进详情。  
- 详情中可 **移除** 单条收藏；**不再在收藏成功后自动弹层**（避免打扰）。

## 7. 回收站
- 文库中「删除」改为 **软删除**（`deletedAt`）。  
- **回收站**中可 **恢复** 或 **彻底删除**；彻底删除会 **级联删除** 该文下的收藏。  
- 从回收站打开/保留阅读时，阅读页顶部有 **轻提示**。

---

运行方式不变：在项目目录执行 `npm run dev`。若需为语法讲解配 OpenAI，仍在 `.env` 中设置 `VITE_OPENAI_API_KEY`。

若你希望 **气泡默认贴在选区上侧/防遮挡** 或 **PDF 内滚动与左栏更精确地锚定页码**，可以说明优先级，我可以再收一版交互细节。

---

**User**

修改：
1、增加一些细微的动效，让交互更自然
2、阅读页要记住自己读到了哪，下次打开时默认文章头，右下角浮出一个箭头提示用户是否定位到上次阅读的位置
3、不是要显示词源而是词根，方便用户记忆单词
4、编辑功能：点击时自动定位在当前阅读的位置

---

**Cursor**

收到，我会在现有实现上补四点：微动效、阅读位置记忆与提示、把词源改成词根导向、以及编辑时自动定位到当前阅读位置。先改核心逻辑再跑一次构建验证。

我先改 `ReaderView`（阅读进度记忆、右下角跳转提示、编辑自动定位），再改词根展示与样式动效，最后整体 build 验证。

已完成主要代码改动，正在跑构建检查是否有类型或编译问题。

已按你这 4 点完成修改并通过构建验证。

## 改动结果

### 1) 增加细微动效，交互更自然
已在 `src/styles/global.css` 增加轻量动效（不过度花哨）：
- 按钮悬停有轻微上浮与阴影过渡
- 图标按钮有轻微缩放
- 文库文章行悬停轻微横向位移
- 阅读卡片进入时 `fadeUpIn`
- “回到上次阅读”浮动按钮有 `floatIn` 动画

---

### 2) 记住阅读位置 + 下次默认顶部 + 右下角箭头提示
已在 `src/components/ReaderView.tsx` 实现：
- **始终默认打开文章顶部**
- 阅读时持续记录进度（按文章 id 存本地）：
  - key: `satie-reader-progress:<articleId>`
- 若存在有效历史进度，下次打开该文会在右下角出现按钮：
  - `↧ 回到上次阅读`
- 用户点击后平滑滚动到上次位置，然后按钮消失

---

### 3) “词根”替代“词源”
已调整：
- `src/services/dictionary.ts`
  - 将返回结构由 `etymology` 改为 `roots: string[]`
  - 增加词根记忆启发式提取：常见前缀/后缀 + 词干建议（并保留来源族线索作为辅助记忆，不再以“词源”字段呈现）
- `src/components/LookupBody.tsx`
  - UI 从“词根 / 来源”改为 **“词根记忆”**
  - 无结果时提示“暂未识别到清晰词根，可结合释义与例句记忆”
- 样式更新为 `.root-list`

---

### 4) 编辑功能：点击时自动定位到当前阅读位置
已在 `src/components/ReaderView.tsx` 实现：
- 点击“编辑”后，会根据当前阅读视窗位置估算正文 offset
- 自动聚焦到编辑 textarea，并把光标与滚动定位到对应位置附近
- 用户可以直接从当前读到的位置继续修改，无需手动再找段落

---

## 验证状态
- `npm run build` 通过（无 TS 报错）
- `ReadLints` 检查无新增 lint 错误

如果你愿意，我下一步可以再补一个开关：  
“打开文章时自动提示上次位置 / 静默不提示”，放到设置里可选。

---

**User**

所有翻译服务都接入豆包大模型，API调用示例如下：

curl https://ark.cn-beijing.volces.com/api/v3/responses \
-H "Authorization: Bearer 07dced98-2a10-49aa-bd7a-e5a54ad5e7a2" \
-H 'Content-Type: application/json' \
-d '{
    "model": "doubao-seed-2-0-pro-260215",
    "input": [
        {
            "role": "user",
            "content": [
                {
                    "type": "input_image",
                    "image_url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png"
                },
                {
                    "type": "input_text",
                    "text": "你看见了什么？"
                }
            ]
        }
    ]
}'

我直接在火山服务器后台登录了，在那里打开了终端，后面怎么操作

公网IP是101.96.213.232

好，那你现在就可以直接通过这个地址访问：

http://101.96.213.232
如果打不开，按这个最短检查顺序来（在服务器终端执行）：

pm2 ls
sudo nginx -t
sudo systemctl status nginx --no-pager
curl -I http://127.0.0.1
curl -I http://101.96.213.232
并在火山控制台确认安全组已放行：

TCP 80（必须）
TCP 443（可选，后续 HTTPS）
TCP 22（管理用）
如果你愿意，我下一步可以给你把 Nginx 直接改成绑定这个 IP（server_name 101.96.213.232;），并加上 HTTPS 的后续方案。

Welcome to nginx!

If you see this page, the nginx web server is successfully installed and working. Further configuration is required.



For online documentation and support please refer to nginx.org.

Commercial support is available at nginx.com.



Thank you for using nginx.

很好，这说明服务器和 Nginx 都通了，只是还在默认站点页。
你现在把默认配置替换成你的 Satie Reader 配置即可。

在服务器终端按下面执行（整段复制）：

# 1) 写入你的站点配置（覆盖默认欢迎页）
sudo tee /etc/nginx/conf.d/satie-reader.conf > /dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name 101.96.213.232;
    root /opt/satie-reader/dist;
    index index.html;
    location / {
        try_files $uri /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
# 2) 关掉默认站点（不同发行版路径可能不同，存在就删）
sudo rm -f /etc/nginx/conf.d/default.conf
sudo rm -f /etc/nginx/sites-enabled/default
# 3) 检查并重载 nginx
sudo nginx -t
sudo systemctl reload nginx
然后刷新浏览器：

http://101.96.213.232
再确认后端代理是否在跑：

pm2 ls
如果没跑，启动：

cd /opt/satie-reader
pm2 start server/proxy.mjs --name satie-api
pm2 save
如果你执行后有任何一条报错，把报错贴我，我直接告诉你改哪一行。

网页在iOS跑的效果不好，请把单个按钮变小，在页面上更宽松一些

已帮你做了 iOS 端的“按钮更小 + 布局更宽松”优化，改动在 src/styles/global.css，并已通过构建。

主要调整：

缩小移动端按钮尺寸（max-width: 768px）
普通按钮：更小的 padding 和 font-size
微按钮（.btn.micro）进一步缩小
拉开常用按钮组间距（更不拥挤）
home-nav、reader-toolbar、fav-actions、trash-actions 等
阅读页移动端留白优化
reader-layout 内边距更轻
reader-toolbar 支持换行，减少顶栏挤压
reader-article 减小卡片内边距，提升可读区比例
弹窗/导入页在小屏也减少压迫感
wizard、confirm-shell、confirm-footer 间距微调
验证：

npm run build ✅ 成功
如果你愿意，我可以再给 iPhone 小屏（如 390px 以下）单独再收一版，让按钮再小一档并把顶栏固定为两行。

再修改：

1、在首页先加上2-3篇示例文章，都是中高阶科技、财经相关的英文文章，并标注“sample”的图标

2、从文章返回首页时动效丢失了

3、在文章阅读界面，删掉“导入”按钮，收藏夹 改成 单词本，并且这几个按钮都加上icon

4、点击单词弹出来的浮窗中，翻译下面是词根、释义和例句、上下文（以上一句的句号结尾处开始取新的这句，直到新的句号），删除引申与搭配

5、收藏到夹 按钮 改成 收藏到单词本，并增加icon

6、侧边栏 按钮 改成 展开至侧栏，并增加icon

7、正文阅读时在小屏幕左右滑动页面也跟着动，这样不行，要根据页面大小来灵活展示页面，不能出现还可以左右滑动整个阅读页的情况

8、在每个段落最后，都增加一个小旗帜icon，点击后会呈现这一段的翻译；这个翻译浮在页面正下方，可以和阅读正文界面独立滚动，也可以被关闭

8 条我都已落地到项目里，并且已通过构建验证（npm run build ✅）。

这次主要改动如下：

首页加入了 3 篇中高阶科技/财经英文示例文章（首次空库自动注入），并在列表里标注 🧪 sample
改动：src/services/storage.ts、src/types.ts、src/App.tsx
从阅读页返回首页时，首页动效恢复
给首页容器重新加了入场动画
改动：src/styles/global.css
阅读页工具栏调整
删除了“导入”按钮
“收藏夹”改为“单词本”
相关按钮都加了 icon（文库、单词本、编辑、保存、取消）
改动：src/components/ReaderView.tsx
划词浮窗内容结构重排（词模式）
顺序改为：翻译 → 词根 → 释义和例句 → 上下文
删除“引申与搭配”
上下文改成“从上一个句号后到下一个句号”为边界抽取
改动：src/components/LookupBody.tsx、src/components/ReaderView.tsx
按钮文案与 icon 调整
“收藏到夹”→“⭐ 收藏到单词本”
“侧边栏”→“⤢ 展开至侧栏”
改动：src/components/LookupBody.tsx、src/components/SnippetBubble.tsx
小屏阅读横向滑动问题修复
全局禁横向滚动 + 阅读正文断词换行 + 工具栏布局约束
改动：src/styles/global.css
每段末尾增加小旗帜 icon
点击 🚩 可翻译该段
翻译在页面底部浮层展示，独立滚动，可关闭
改动：src/components/ReaderView.tsx、src/styles/global.css
术语统一
抽屉标题“收藏夹”改成“单词本”
改动：src/components/FavoritesDrawer.tsx
如果你愿意，我下一步可以再做一轮 iPhone 真实视口（390px）专门微调，把阅读页顶部按钮再压缩成更稳定的两行布局。