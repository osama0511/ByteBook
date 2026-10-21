# 👾 ByteBook — وثيقة المعمارية الهندسية ونظام التصميم (Architecture & Master Plan)

> **الإصدار:** 1.0.0-alpha (Phase 1 — Foundation & Clean Architecture)  
> **المنصات المستهدفة:** iOS (Native via Expo) + Web / Standalone PWA (Offline-First)  
> **الهوية البصرية:** 16-Bit Retro Pixel Art Aesthetic × Reflowable Technical Reader  
> **النمط المعماري:** Clean Architecture + Modular Domain-Driven Layers + Local-First Storage  

---

## 1. الرؤية الهندسية العامة (Architectural Vision)

يمثل مشروع **ByteBook** جيلاً جديداً من قارئات الكتب التخصصية وتطوير اللغة الإنجليزية؛ حيث يدمج بين **سلاسة النصوص المتدفقة (Reflowable Text)** على غرار تطبيق "أبجد"، و**الذكاء الاصطناعي السياقي المزدوج** للترجمة والشرح، مع **ربط تفاعلي ذكي بالصور والأشكال التوضيحية (Figures & Diagrams)**، داخل قالب بصري فريد مستوحى من ألعاب الـ **16-Bit RPG والمخطوطات الرقمية الكلاسيكية (Pixel Art UI)**.

لضمان عمل التطبيق بكفاءة عالية على **iOS** و**Web/PWA** (بشكل مستقل تماماً وبدون الحاجة إلى حاسوب بعد التثبيت)، تم تصميم البنية التحتية وفق مبدأ **Local-First & Platform-Agnostic Abstraction**:
- كافة عمليات تحليل الكتب (Parsing)، التجزئة اللغوية (Tokenization)، وربط الصور (Figure Linking) تتم محلياً داخل الجهاز وتُحفظ في قاعدة بيانات مهيكلة.
- طبقة تجريد موحدة للتخزين (`database/` و `storage/`) تتعامل مع `expo-sqlite` و `expo-file-system` و `expo-secure-store` على iOS، مع بدائل Web/PWA متوافقة (IndexedDB / OPFS / Web Storage) لضمان استمرارية العمل Offline.

```
+-----------------------------------------------------------------------------------+
|                               PRESENTATION LAYER                                  |
|  +---------------------------+  +-----------------------+  +-------------------+  |
|  |   Expo Router Screens     |  |   Reader Engine UI    |  |   Pixel UI Kit    |  |
|  |  (Library, Reader, Vault) |  | (FlashList, Popovers) |  | (8/16-bit System) |  |
|  +-------------+-------------+  +-----------+-----------+  +---------+---------+  |
+----------------|----------------------------|------------------------|------------+
                 |                            |                        |
+----------------v----------------------------v------------------------v------------+
|                             STATE MANAGEMENT LAYER                                |
|  +-----------------------------------------------------------------------------+  |
|  |  Zustand Stores: useThemeStore | useReaderStore | useLibraryStore | Vocab   |  |
|  +-----------------------------------------------------------------------------+  |
+----------------|----------------------------|------------------------|------------+
                 |                            |                        |
+----------------v----------------------------v------------------------v------------+
|                           DOMAIN & APPLICATION SERVICES                           |
|  +---------------------------+  +-----------------------+  +-------------------+  |
|  |   Book Ingestion Engine   |  |  Tokenization & AST   |  |  Dual AI Engine   |  |
|  |   (EPUB / PDF / TXT)      |  |  Figure Ref Detector  |  | (Contextual + Dict|  |
|  +-------------+-------------+  +-----------+-----------+  +---------+---------+  |
+----------------|----------------------------|------------------------|------------+
                 |                            |                        |
+----------------v----------------------------v------------------------v------------+
|                          DATA & INFRASTRUCTURE LAYER                              |
|  +---------------------------+  +-----------------------+  +-------------------+  |
|  |   SQLite Engine (Local)   |  |  Asset File Storage   |  |  Secure Key Vault |  |
|  | (Books, Blocks, Figures)  |  | (Extracted Fig Images)|  | (API Keys & Prefs)|  |
|  +---------------------------+  +-----------------------+  +-------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. هيكلة المجلدات القياسية (Clean Folder Structure)

```text
ByteBook/
├── app/                                # Expo Router (File-based Routing & PWA Entry)
│   ├── _layout.tsx                     # Root Provider (Fonts, Theme, SQLite Init)
│   ├── index.tsx                       # شاشة المكتبة الرئيسية (Pixel Bookshelf)
│   ├── reader/[bookId].tsx             # شاشة القارئ التفاعلي المتدفق
│   └── settings.tsx                    # إعدادات الثيم، الخطوط، ومفاتيح الذكاء الاصطناعي
├── theme/
│   └── pixelDesignSystem/              # نظام التصميم وهوية البكسل البصرية
│       ├── index.ts
│       ├── palettes.ts                 # لوحات الألوان الثلاث (Manuscript, Phosphor, Aged Paper)
│       ├── typography.ts               # إعدادات خطوط البكسل وخطوط القراءة المريحة
│       ├── bordersAndShadows.ts        # خوارزميات إطارات البكسل الحادة والظلال الصلبة
│       └── tokens.ts                   # الوحدات القياسية (4px Grid System)
├── components/
│   ├── pixel-ui/                       # مكتبة مكونات 8-bit / 16-bit القابلة لإعادة الاستخدام
│   │   ├── index.ts
│   │   ├── PixelFrame.tsx              # حاوية بإطار بكسل متدرج (Stepped Corner Frame)
│   │   ├── PixelButton.tsx             # زر تفاعلي بظل صلب وإزاحة حركية عند الضغط
│   │   ├── PixelBadge.tsx              # شارة بكسل inline للإشارات المرجعية للصور
│   │   ├── PixelModal.tsx              # نافذة حوارية كلاسيكية (RPG Dialog Box)
│   │   └── PixelProgressBar.tsx        # شريط تقدم القراءة بتقطيع بكسلي
│   └── reader/                         # مكونات محرك القراءة التفاعلي
│       ├── index.ts
│       ├── ReflowableReaderView.tsx    # القارئ المتدفق عالي الأداء عبر @shopify/flash-list
│       ├── InteractiveParagraph.tsx    # عارض الفقرات والجمل والكلمات التفاعلية
│       ├── TranslationPopover.tsx      # بطاقة الترجمة السياقية الفورية (كلمة/جملة/فقرة)
│       └── FigureLightboxModal.tsx     # عارض الصور التفاعلي المرتبط بالمعرّفات (IDs)
├── services/
│   ├── parser/                         # محرك تحليل واستخراج الكتب (Ingestion Pipeline)
│   │   ├── index.ts
│   │   ├── types.ts                    # عقود بيانات التحليل والتجزئة والصور
│   │   ├── bookParserService.ts        # المنسق الرئيسي (EPUB / PDF / TXT -> JSON Blocks)
│   │   ├── tokenizerEngine.ts          # خوارزمية تجزئة النصوص (Paragraph -> Sentence -> Word)
│   │   └── figureReferenceDetector.ts  # خوارزمية اكتشاف مراجع الصور وتحويلها لـ Pixel Badges
│   └── translation/                    # محرك الذكاء الاصطناعي والترجمة السياقية المزدوج
│       ├── index.ts
│       ├── types.ts
│       ├── dualTranslationEngine.ts    # المحرك المزدوج (ترجمة معجمية فورية + سياقية بالذكاء الاصطناعي)
│       └── promptBuilder.ts            # بناء Prompts ذكية تتضمن سياق الفقرة ومجال الكتاب
├── database/                           # طبقة قاعدة البيانات المحلية (SQLite)
│   ├── index.ts
│   ├── schema.ts                       # جداول الكتب، الفصول، الكتل النصية، الصور، والمفردات
│   └── sqliteClient.ts                 # إدارة الاتصال والاستعلامات المفهرسة
├── storage/                            # طبقة التخزين الآمن وإدارة الملفات
│   ├── index.ts
│   ├── secureVault.ts                  # تخزين مفاتيح الـ API بأمان (expo-secure-store + Web Fallback)
│   └── assetStorage.ts                 # حفظ واسترجاع صور الكتب المستخرجة (expo-file-system)
└── store/                              # إدارة الحالة العامة عبر Zustand
    ├── index.ts
    ├── useThemeStore.ts                # حالة الثيم النشط، حجم الخط، وإعدادات العرض
    ├── useReaderStore.ts               # حالة القارئ، الكلمة/الجملة المحددة، والصورة النشطة
    └── useLibraryStore.ts              # حالة المكتبة والكتب قيد التحليل
```

---

## 3. نظام تصميم البكسل (Pixel UI Kit — `theme/pixelDesignSystem`)

لا يعتمد **ByteBook** على صور خلفية ثابتة، بل يبني نظام رسم بكسلي برمجي (Procedural Pixel Design System) يعمل بدقة رياضية مضاعفة للرقم `2px` و `4px` (Pixel Grid Unit = `4px`) مع إلغاء تام للحواف الدائرية التقليدية (`borderRadius: 0`) والظلال الضبابية (`shadowRadius: 0`).

### 3.1 كيف نبني إطارات البكسل الحادة (Pixelated Stepped Borders)؟
في فن البكسل (16-bit)، لا تكون الزوايا ملساء بل مقطوعة بشكل متدرج (Notched / Stepped Corners). نحقق ذلك عبر تقنيتين متكاملتين:
1. **تقنية الأركان المتقاطعة (Clipped / Notched Corner Matrix):**
   يتكون `PixelFrame` من حاوية رئيسية ذات حدود داخلية وخارجية مزدوجة (`Outer Border 2px` + `Inner Highlight 2px` لإعطاء عمق بارز Bevel)، مع 4 مربعات ركنية صغيرة (`4x4px`) في الزوايا الأربع تأخذ لون خلفية الشاشة الأب لقطع الزاوية وإنتاج تأثير الـ **8-bit Cut Corner** الأصيل على كل من iOS و Web.
2. **الحواف المزدوجة ذات الإضاءة العلوية (3D Bevel Edge):**
   - الحافة العلوية واليسرى: لون إضاءة فاتح (`borderHighlight`) بسمك `2px`.
   - الحافة السفلية واليمنى: لون ظل داكن (`borderShadow`) بسمك `2px`.
   - الإطار الخارجي المحيط: لون الحبر الداكن (`borderOuter`) بسمك `2px` أو `4px`.

```text
      [Outer Border 2px]
    +--------------------+
  +-+--------------------+--+
  | | Highlight (Top/Left)  |
  | |                       |
  | |     CONTENT AREA      |
  | |                       |
  | |    Shadow (Bot/Right) |
  +-+--------------------+--+
    +--------------------+
```

### 3.2 كيف نبني الظلال الصلبة الكلاسيكية (Retro Hard Shadows)؟
في CSS و React Native، الظلال الافتراضية تستخدم Gaussian Blur. في **ByteBook**، نبتكر **Hard Block Shadow**:
- على **iOS / Native**: نستخدم طبقة خلفية توأمية مطابقة (`Absolute Positioned Shadow Layer`) مزاحة بمقدار `4px` أفقياً و`4px` عمودياً (`translateX: 4, translateY: 4`) بلون ظل صلب 100% بدون أي شفافية ضبابية، أو عبر `shadowOffset: { width: 4, height: 4 }`, `shadowRadius: 0`, `shadowOpacity: 1`.
- على **Web**: ندعم كذلك `box-shadow: 4px 4px 0px 0px var(--shadow-color)` للحصول على حافة حادة 100%.

### 3.3 أزرار 8-bit / 16-bit التفاعلية (`PixelButton`)
يمتلك الزر ثلاث حالات فيزيائية ملموسة (Tactile States):
1. **حالة السكون (Idle):**
   - إزاحة الزر: `translateX: 0, translateY: 0`
   - الظل الصلب الخلفي: `offset: 4px × 4px`
   - إضاءة داخلية علوية `2px`.
2. **حالة التحويم/التركيز (Hover/Focus - Web & iPad Trackpad):**
   - إزاحة الزر للأعلى بمقدار `-1px` مع توهج خفيف للحدود.
3. **حالة الضغط (Pressed / Active):**
   - يتحرك جسم الزر فيزيائياً باتجاه الظل بمقدار `translateX: +4px, translateY: +4px`.
   - يختفي الظل الخلفي (`offset: 0px × 0px`) مما يمنح المستخدم شعوراً ميكانيكياً حقيقياً بضغط زر أركيد أو جهاز كلاسكي، مدعوماً بنقرة اهتزازية خفيفة عبر `expo-haptics` على iOS.

### 3.4 لوحات الألوان والثيمات الثلاثة (Retro Theme Palettes)

تم ضبط التباين اللوني (WCAG AAA Contrast) ليكون مريحاً جداً للقراءة الطويلة مع الحفاظ على روح الـ 16-bit:

| الخاصية (Token) | 1. ثيم المخطوطة الكلاسيكية (`classic_manuscript`) | 2. ثيم شاشة الفوسفور الليلية (`night_phosphor`) | 3. ثيم الورق القديم (`aged_paper`) |
| :--- | :--- | :--- | :--- |
| **الطابع البصري** | مخطوطة RPG ملكية دافئة بإطارات بنية وذهبية | شاشة CRT كهرمانية/خضراء داكنة للقراءة الليلية العميقة | كتاب تقني عتيق (Grimoire / Sepia) منخفض التوهج |
| `backgroundPrimary` | `#F4ECD8` (رقّ مخطوطة فاتح) | `#0D130F` (أسود فوسفوري عميق) | `#E6D7B9` (ورق قديم معتّق) |
| `backgroundSecondary` | `#EAE0C8` (بطاقات وأشرطة) | `#141E18` (لوحة CRT فرعية) | `#D8C6A3` (حاويات فرعية) |
| `surfaceElevated` | `#FFFDF7` (نافذة الترجمة المنبثقة) | `#1B2921` (نافذة منبثقة مضيئة) | `#EFE3CA` (سطح مرتفع) |
| `textPrimary` | `#2B1E16` (حبر بني داكن جداً) | `#72F1B8` (فوسفور أخضر مريح للعين) | `#36261B` (حبر سيبيا عتيق) |
| `textSecondary` | `#5C4636` (حواشٍ وشروحات) | `#48A87D` (فوسفور خافت) | `#634B3A` (نصوص فرعية) |
| `accentPrimary` | `#C84B31` (أحمر ختم ملكي) | `#FFB000` (كهرمان CRT كلاسيكي) | `#8C3B2B` (قرمزي عتيق) |
| `accentSecondary` | `#2D6A4F` (زمردي للشارات) | `#00E5FF` (سماوي 8-bit للروابط) | `#3D5A6C` (أزرق حبري للصور) |
| `borderOuter` | `#2B1E16` (إطار بكسل داكن) | `#346856` (إطار فوسفوري محدد) | `#3E2C1E` (إطار حبري) |
| `borderHighlight` | `#FFF9EB` (حافة إضاءة علوية) | `#72F1B8` (توهج علوي) | `#F4E9D2` (إضاءة ورقية) |
| `shadowHard` | `#2B1E16` (ظل صلب 100%) | `#050806` (ظل CRT أسود قاتم) | `#2A1D13` (ظل بني صلب) |
| `selectionHighlight`| `#F7D08A` (تظليل الكلمة/الجملة النشطة)| `#264F3C` (تظليل عكسي فوسفوري) | `#C9B182` (تظليل دافئ) |

### 3.5 منظومة الخطوط المزدوجة (Dual Typography System)
- **خطوط واجهة المستخدم والعناوين والشارات (Pixel UI Fonts):**
  - `PressStart2P_400Regular`: للعناوين الرئيسية، الشعارات، وأزرار الـ Arcade/RPG البارزة.
  - `Silkscreen_400Regular` / `Silkscreen_700Bold`: لشارات الصور (`[FIG. 3]`)، التسميات التوضيحية، وأزرار التحكم الصغيرة (قراءة فائقة الوضوح في الأحجام الصغيرة).
  - `VT323_400Regular`: للإحصائيات، أرقام الصفحات، عداد الكلمات، وحقول القاموس.
- **خطوط القراءة المتدفقة المريحة للعين (Reflowable Reading Fonts):**
  - لأن قراءة كتاب تخصصي من 600 صفحة بخط بكسل بالكامل قد تجهد العين، يفصل **ByteBook** بذكاء بين **واجهة البكسل** و**متن القراءة المريح** (مع إمكانية تبديل المستخدم لخط المتن إلى `VT323` إذا أراد تجربة ريترو 100%).

---

## 4. خط أنابيب تحويل الكتب (Book Ingestion & Conversion Pipeline)

يحول المحرك (`services/parser`) ملفات الكتب (`EPUB`, `PDF`, `TXT`) إلى **هيكل JSON نصي متدفق (Reflowable Block Stream)** مخزن في `SQLite`، بحيث يتم التخلص تماماً من قيود الصفحات الثابتة (Fixed Pages) لصالح التدفق المرن الذي يتكيف مع أي حجم خط أو شاشة.

```
[الملف الأصلي: EPUB / PDF / TXT]
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ 1. المستخرج الأولي (Format Unpacker)                     │
│  • EPUB: فك ضغط الأرشيف، قراءة OPF Spine وملفات XHTML    │
│  • PDF : استخراج النصوص المتدفقة مع إحداثيات الكتل والصور│
│  • TXT : تقسيم الفصول والفقرات عبر الأنماط الهيكلية      │
└───────┬──────────────────────────────────────────┬───────┘
        │ (النصوص والهيكل)                         │ (ملفات الصور الخام)
        ▼                                          ▼
┌───────────────────────────────┐        ┌─────────────────────────────────┐
│ 2. محلل الكتل (Block Normalizer)│      │ 3. مستخرج الصور (Asset Extractor)│
│  • تحويل العناوين والفقرات    │        │  • حفظ الصورة في FileSystem/IDB │
│    والأكواد والقوائم إلى كتل  │        │  • توليد معرّف فريد (figure_id)  │
│    قياسية (ContentBlocks)     │        │  • ربط التسمية التوضيحية (Caption│
└───────┬───────────────────────┘        └─────────┬───────────────────────┘
        │                                          │
        └──────────────────┬───────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 4. محرك التجزئة وربط الصور (Tokenizer & Figure Linker)   │
│  • تجزئة الفقرة ◄ جمل (Sentences) ◄ كلمات (Word Tokens) │
│  • اكتشاف إشارات الصور (Figure 3, [3]) وربطها بـ figure_id│
└───────┬──────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ 5. الحفظ المحلي المفهرس (SQLite Transactional Persist)   │
│  • جدول books | chapters | content_blocks | book_figures │
└──────────────────────────────────────────────────────────┘
```

### 4.1 فصل الصور وربطها بمعرّفات (Image Separation & ID Binding)
عند تحليل الكتاب:
1. أي صورة أو رسم بياني داخل الفصل يتم استخراجه وحفظه كملف مستقل في `FileSystem.documentDirectory + 'bytebook_assets/{bookId}/{figureId}.png'` (أو Blob في Web IndexedDB).
2. يتم إنشاء سجل للصورة في جدول `book_figures` يحتوي على:
   - `id`: المعرّف الفريد الداخلي (مثل `fig_ch2_003`).
   - `label_number`: الرقم المرجعي المستنتج من الكابشن أو الترتيب (مثل `"3"`, `"3.2"`, `"II"`).
   - `caption`: النص التوضيحي الكامل أسفل الصورة (الذي يخضع بدوره للتجزئة ليصبح قابلاً للترجمة!).
   - `local_uri`: مسار الصورة المحلي السريع.
   - `anchor_block_id`: معرّف الكتلة النصية التي ظهرت عندها الصورة في التسلسل الأصلي للكتاب.

### 4.2 مخطط قاعدة البيانات المحلية (SQLite Schema & JSON Structure)

يتم تخزين الكتل النصية في جدول `content_blocks` بحيث يقرأ `@shopify/flash-list` الكتل حسب الفصل بكفاءة $O(1)$ وبدون تحميل الكتاب كاملاً في الذاكرة العشوائية (RAM):

```sql
-- 1. جدول الكتب
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  format TEXT NOT NULL,              -- 'epub' | 'pdf' | 'txt'
  cover_uri TEXT,
  total_chapters INTEGER DEFAULT 0,
  total_blocks INTEGER DEFAULT 0,
  current_chapter_index INTEGER DEFAULT 0,
  current_block_index INTEGER DEFAULT 0,
  reading_progress REAL DEFAULT 0,
  domain_context TEXT,               -- مثل: 'Software Architecture', 'Medicine', 'General'
  created_at INTEGER NOT NULL,
  last_read_at INTEGER
);

-- 2. جدول الفصول
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  block_count INTEGER DEFAULT 0,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 3. جدول الكتل النصية المتدفقة (الفقرات، العناوين، الأكواد)
CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  block_index INTEGER NOT NULL,
  block_type TEXT NOT NULL,          -- 'heading' | 'paragraph' | 'code' | 'quote' | 'figure_anchor'
  raw_text TEXT NOT NULL,            -- النص الخام الكامل للفقرة (للبحث والسياق)
  tokenized_payload TEXT NOT NULL,   -- هيكل JSON الدقيق للجمل والكلمات وشارات الصور
  referenced_figure_ids TEXT,        -- مصفوفة JSON بمعرّفات الصور المشار إليها في هذه الفقرة
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 4. جدول الصور والأشكال التوضيحية المفصولة
CREATE TABLE IF NOT EXISTS book_figures (
  id TEXT PRIMARY KEY,               -- مثال: 'book1_fig_3'
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  figure_number TEXT NOT NULL,       -- مثال: '3' أو '2.4' أو 'A'
  normalized_keys TEXT NOT NULL,     -- مفاتيح المطابقة: '["3", "fig.3", "figure 3"]'
  caption TEXT,
  local_uri TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  anchor_block_id TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 5. جدول بنك المفردات والترجمات المحفوظة (Vocabulary & Cache)
CREATE TABLE IF NOT EXISTS saved_translations (
  id TEXT PRIMARY KEY,
  book_id TEXT,
  target_type TEXT NOT NULL,         -- 'word' | 'sentence' | 'paragraph'
  source_text TEXT NOT NULL,
  context_sentence TEXT,
  translated_text TEXT NOT NULL,
  grammar_notes TEXT,                -- شرح القواعد أو المصطلح التخصصي
  mastery_level INTEGER DEFAULT 0,   -- لتطوير اللغة الإنجليزية (Spaced Repetition)
  created_at INTEGER NOT NULL
);
```

---

## 5. خوارزمية تجزئة النصوص ثلاثية المستويات (Hierarchical Text Tokenization)

لتحقيق تجربة القراءة التفاعلية الفورية، لا نعرض الفقرة كسلسلة نصية صماء (`<Text>{paragraph}</Text>`)، بل تمر كل فقرة عبر **محرك تجزئة هرمي (`services/parser/tokenizerEngine.ts`)** ينتج شجرة رموز (Token AST) من 3 مستويات:

1. **المستوى الأول — الفقرة (`ParagraphBlock`):**
   تمثل الوحدة الفكرية الكاملة. الضغط على زر `[TR: PARAGRAPH]` يترجم الفقرة كاملة مع الحفاظ على المصطلحات التخصصية، كما تُستخدم الفقرة كـ **إطار سياقي (Context Window)** عند ترجمة أي كلمة أو جملة بداخلها.
2. **المستوى الثاني — الجملة (`SentenceNode`):**
   يتم تقسيم الفقرة إلى جمل باستخدام خوارزمية واعية بالاختصارات الإنجليزية (Abbreviation-Aware Sentence Boundary Detection) بحيث لا تنكسر الجملة خطأً عند اختصارات مثل `Fig. 3`, `Dr.`, `e.g.`, `i.e.`, `v1.2`.
   - الضغط المطول (Long Press) أو النقر المزدوج على أي كلمة يحدد **الجملة الكاملة (`SentenceNode`)** ويبرزها بلون `selectionHighlight` لترجمتها سياقياً.
3. **المستوى الثالث — الكلمة أو الشارة (`InlineToken`):**
   داخل كل جملة، يتم تفكيك النص إلى عناصر متجاورة تشمل:
   - `word`: كلمة قابلة للنقر الفردي (`Single Tap`) تحتوي على النص السطحي (`surface`)، الجذر المعجمي المنظف (`normalizedLemma`)، وموقعها داخل الجملة (`sentenceIndex`).
   - `punctuation` / `whitespace`: علامات الترقيم والمسافات لضمان بقاء شكل النص الطبيعي 100%.
   - `figure_badge`: إشارة مرجعية لصورة تم اكتشافها وتحويلها إلى شارة بكسل تفاعلية!

### مثال لهيكل `tokenized_payload` المخزن داخل SQLite:
```json
{
  "blockId": "blk_104",
  "sentences": [
    {
      "sentenceId": "blk_104_s0",
      "rawSentence": "As illustrated in Figure 3, the neural attention layer weights converge rapidly.",
      "tokens": [
        { "id": "t0", "type": "word", "text": "As", "clean": "as" },
        { "id": "t1", "type": "space", "text": " " },
        { "id": "t2", "type": "word", "text": "illustrated", "clean": "illustrated" },
        { "id": "t3", "type": "space", "text": " " },
        { "id": "t4", "type": "word", "text": "in", "clean": "in" },
        { "id": "t5", "type": "space", "text": " " },
        {
          "id": "t6",
          "type": "figure_badge",
          "text": "Figure 3",
          "figureId": "book1_fig_3",
          "figureNumber": "3",
          "badgeLabel": "🖼️ FIG.3"
        },
        { "id": "t7", "type": "punctuation", "text": "," },
        { "id": "t8", "type": "space", "text": " " },
        { "id": "t9", "type": "word", "text": "the", "clean": "the" }
      ]
    }
  ]
}
```

### لماذا هذا الهيكل عالي الأداء؟
- يتم إجراء التجزئة **مرة واحدة فقط** أثناء استيراد الكتاب وحفظها في SQLite (أو عند الطلب للفقرات الظاهرة مع التخزين المؤقت).
- أثناء التمرير السريع في `@shopify/flash-list`، يقوم المكون `InteractiveParagraph` بقراءة الـ JSON الجاهز ورسم الكلمات وشارات البكسل فوراً بسرعة 60fps/120fps بدون أي عمليات Regex ثقيلة في خيط الواجهة (UI Thread).

---

## 6. خوارزمية اكتشاف الإشارات المرجعية للصور (`figureReferenceDetector.ts`)

الكتب التخصصية (الهندسية، الطبية، البرمجية، العلمية) مليئة بالإحالات النصية للأشكال التوضيحية التي غالباً ما تكون في صفحة أخرى، مما يشتت القارئ. في **ByteBook**، نقوم بحل هذه المشكلة جذرياً عبر **خوارزمية الربط ثنائية المراحل (Two-Pass Figure Linker)**:

### المرحلة الأولى: بناء فهرس الأشكال والصور (Figure Registry Indexing)
أثناء استخراج الصور والتسميات التوضيحية (Captions) من الفصل أو الكتاب، يبني المحلل خريطة بحث سريعة (`Map<NormalizedKey, FigureRecord>`) تدعم الأنماط القياسية في الكتب الأكاديمية والتقنية:
- الأرقام المباشرة: `"3"`, `"12"`
- الأرقام المركبة بالفصول: `"3.1"`, `"4-2"`, `"2.14a"`
- الأرقام الرومانية أو الحروف: `"II"`, `"IV"`, `"A"`

### المرحلة الثانية: المسح اللغوي الذكي داخل الفقرات (Contextual Pattern Scanner)
تعتمد الخوارزمية على تعبيرات نمطية مركبة (Multi-Pattern Regex Grammar) مع فلتر سياقي لتجنب الإيجابيات الكاذبة (False Positives):

1. **الأنماط الصريحة (Explicit Figure Mentions):**
   تلتقط الإشارات المباشرة مثل:
   - `Figure 3`, `Figures 3 and 4`, `Fig. 3.2`, `Fig 4a`
   - `Diagram 2`, `Chart 1.4`, `Plate III`, `Exhibit 5`, `Illustration 2`
   - النمط البرمجي:
     ```regex
     /\b(?:Figures?|Figs?\.?|Diagrams?|Charts?|Plates?|Exhibits?|Illustrations?)\s*#?\s*(\d+(?:[.\-]\d+)?[a-zA-Z]?|[IVXLCDM]+)\b/gi
     ```

2. **الأنماط القوسية المرجعية المرتبطة بصور (Bracketed Visual References):**
   تلتقط الإشارات مثل `[Fig. 3]`, `(see [3])`, أو `[3]` **بشرط تحقق القيد السياقي**:
   - لكي لا يختلط `[3]` الخاص بحاشية الببليوغرافيا مع الصورة رقم 3، يتحقق المحرك من:
     1. هل توجد صورة مسجلة في نفس الفصل تحمل الرقم `3`؟
     2. هل يسبق القوس `[3]` أفعال بصرية دالة في نفس الجملة مثل: *(see, shown in, illustrated in, depicted in, refer to, as in, view)*؟
   - إذا تحقق الشرط، يتم ترقيته إلى شارة صورة تفاعلية (`PixelBadge`)؛ وإلا يبقى مرجعاً نصياً عادياً.

### التحويل إلى شارة بكسل تفاعلية (`PixelBadge`)
عند مطابقة الإشارة النصية مع سجل الصورة في `book_figures`:
- يُستبدل النص الصامت بعقدة `figure_badge` داخل شجرة الجملة.
- يرسمها القارئ كـ **شارة بكسل بارزة (`PixelBadge`)** بخط `Silkscreen` وألوان `accentSecondary`:
  - عند **النقر الفردي (Tap)**: تفتح نافذة `FigureLightboxModal` الفورية فوق النص لعرض الصورة بدقة كاملة مع إمكانية التكبير (Zoom/Pan) وقراءة وترجمة الـ Caption دون مغادرة مكان القراءة!
  - عند **الضغط على زر "الانتقال لموقع الصورة في النص"**: ينتقل `FlashList` مباشرة إلى `anchor_block_id` ويعيد القارئ بضغطة واحدة إلى فقرته الأصلية (Back-to-Reading Anchor).

---

## 7. محرك الذكاء الاصطناعي والترجمة السياقية المزدوج (`services/translation`)

يعمل المحرك بنظام هجين ذكي يجمع بين **السرعة الصفرية** و**العمق السياقي**:

1. **المسار الأول — الكاش المحلي والمعجم السريع (Local SQLite Cache & Instant Lookup):**
   - قبل إرسال أي طلب للشبكة، يفحص المحرك جدول `saved_translations` للتحقق مما إذا كانت الكلمة/الجملة قد تُرجمت سابقاً في نفس السياق.
2. **المسار الثاني — الذكاء الاصطناعي السياقي (Contextual AI Engine):**
   - عند نقر المستخدم على **كلمة**، لا نرسل الكلمة منفردة إلى النموذج اللغوي، بل نرسل حمولة سياقية (Contextual Payload):
     ```json
     {
       "targetType": "word",
       "selectedText": "weights",
       "surroundingSentence": "As illustrated in Figure 3, the neural attention layer weights converge rapidly.",
       "paragraphContext": "...",
       "bookDomain": "Deep Learning & Artificial Intelligence"
     }
     ```
   - النتيجة: بدلاً من ترجمة `"weights"` حرفياً إلى *"أوزان/أثقال"*، يترجمها المحرك سياقياً إلى **"المعاملات الوزنية (في الشبكات العصبية)"** مع:
     - المعنى السياقي الدقيق بالعربية.
     - المعنى اللغوي العام والجذر التصريفي (Lemma & Part of Speech).
     - مثال إضافي لتثبيت المفردة.

---

## 8. خارطة طريق التنفيذ للمرحلة القادمة (Phase 2 Readiness)

بانتهاء هذه المرحلة التأسيسية، أصبحت بيئة **ByteBook** جاهزة بالكامل وتضم:
1. تهيئة مشروع Expo Router + TypeScript مع دعم iOS و Web/PWA.
2. تثبيت كافة المكتبات الأساسية (`expo-sqlite`, `expo-file-system`, `expo-document-picker`, `expo-secure-store`, `@shopify/flash-list`, `zustand`, وخطوط البكسل والقراءة).
3. بناء الهيكل المعماري الكامل والعقود البرمجية (Interfaces, Types, Themes, Schemas, Stores).

في الرسالة القادمة، سننتقل مباشرة إلى **كتابة المنطق البرمجي الكامل والشاشات التفاعلية** فوق هذه البنية الصلبة.
