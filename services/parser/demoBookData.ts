/**
 * ByteBook — Built-in Interactive Demo Books
 * Pre-loaded from the very first launch so the user can immediately experience:
 * - Reflowable Computer Science & AI chapters
 * - Word & Paragraph Contextual Translation + Scientific Concept Simplification
 * - Interactive Figure Badges ([1], Figure 2, Fig. 3, (4), Figure 5, [6])
 * - High-Resolution Zoomable 16-Bit Technical Schematics
 */

import { BookFigureRecord } from './types';

export interface RawDemoBookSpec {
  bookId: string;
  title: string;
  author: string;
  format: 'epub' | 'pdf' | 'txt';
  coverAccentColor: string;
  domainContext: string;
  readingProgress: number;
  currentChapterIndex: number;
  currentBlockIndex: number;
  lastReadSnippet: string;
  rawChapters: {
    title: string;
    paragraphs: {
      text: string;
      attachedFigureIds?: string[];
      translationAr: string;
      simplifiedConceptAr: string;
    }[];
  }[];
  figures: BookFigureRecord[];
}

export const BUILTIN_DEMO_BOOKS: RawDemoBookSpec[] = [
  {
    bookId: 'bytebook_cs_ai_masterpiece',
    title: 'The Architecture of Intelligent Systems',
    author: 'Dr. Alan Vance & ByteBook Press',
    format: 'epub',
    coverAccentColor: '#C84B31',
    domainContext: 'Computer Science, Deep Learning & Distributed Systems',
    readingProgress: 0.34,
    currentChapterIndex: 0,
    currentBlockIndex: 1,
    lastReadSnippet:
      'As illustrated in [1], the Scaled Dot-Product Attention kernel computes compatibility scores between Query and Key vectors...',
    figures: [
      {
        id: 'bytebook_cs_ai_masterpiece_fig_1',
        bookId: 'bytebook_cs_ai_masterpiece',
        chapterId: 'bytebook_cs_ai_masterpiece_ch_0',
        figureNumber: '1',
        normalizedKeys: ['1', 'fig.1', 'figure 1', 'fig 1', 'شكل 1'],
        title: 'Figure 1: Multi-Head Transformer Attention Matrix',
        caption:
          'Figure 1: Scaled Dot-Product Attention pipeline showing Query (Q), Key (K), and Value (V) tensor projections, softmax scaling, and residual layer normalization.',
        captionAr:
          'الشكل 1: مسار الانتباه الموزون بحاصل الضرب النقطي، يوضح إسقاطات مصفوفات الاستعلام (Q) والمفتاح (K) والقيمة (V) متبوعة بدالة Softmax والتطبيع الطبقي.',
        localUri: 'schematic://transformer_attention',
        svgDiagramKey: 'transformer_attention',
        anchorBlockId: 'bytebook_cs_ai_masterpiece_ch_0_blk_1',
      },
      {
        id: 'bytebook_cs_ai_masterpiece_fig_2',
        bookId: 'bytebook_cs_ai_masterpiece',
        chapterId: 'bytebook_cs_ai_masterpiece_ch_0',
        figureNumber: '2',
        normalizedKeys: ['2', 'fig.2', 'figure 2', 'fig 2', 'شكل 2'],
        title: 'Figure 2: GPU SRAM vs. HBM Memory Bandwidth Hierarchy',
        caption:
          'Figure 2: Latency and bandwidth pyramid comparing On-Chip SRAM registers (19 TB/s) against High-Bandwidth Memory HBM3 (3.35 TB/s) used in FlashAttention tiling.',
        captionAr:
          'الشكل 2: هرم سرعة ونطاق الذاكرة في المعالجات الرسومية، يقارن بين ذاكرة SRAM الفائقة على الشريحة وذاكرة HBM3 عالية النطاق المستخدمة في خوارزمية FlashAttention.',
        localUri: 'schematic://memory_hierarchy',
        svgDiagramKey: 'memory_hierarchy',
        anchorBlockId: 'bytebook_cs_ai_masterpiece_ch_0_blk_2',
      },
      {
        id: 'bytebook_cs_ai_masterpiece_fig_3',
        bookId: 'bytebook_cs_ai_masterpiece',
        chapterId: 'bytebook_cs_ai_masterpiece_ch_1',
        figureNumber: '3',
        normalizedKeys: ['3', 'fig.3', 'figure 3', 'fig 3', 'شكل 3'],
        title: 'Figure 3: Multi-Tier JIT Compilation & Bytecode Optimizer',
        caption:
          'Figure 3: Source code lexical tokenization into an Abstract Syntax Tree (AST), bytecode generation, profiling feedback, and hot-loop machine code emission.',
        captionAr:
          'الشكل 3: خط أنابيب المترجم الفوري (JIT) بدءاً من التحليل اللغوي وبناء شجرة Syntax (AST) مروراً بتوليد الـ Bytecode وصولاً لترجمة الحلقات الساخنة إلى لغة الآلة.',
        localUri: 'schematic://jit_compiler_pipeline',
        svgDiagramKey: 'jit_compiler_pipeline',
        anchorBlockId: 'bytebook_cs_ai_masterpiece_ch_1_blk_1',
      },
      {
        id: 'bytebook_cs_ai_masterpiece_fig_4',
        bookId: 'bytebook_cs_ai_masterpiece',
        chapterId: 'bytebook_cs_ai_masterpiece_ch_2',
        figureNumber: '4',
        normalizedKeys: ['4', 'fig.4', 'figure 4', 'fig 4', 'شكل 4'],
        title: 'Figure 4: Raft Distributed Consensus State Machine',
        caption:
          'Figure 4: Quorum election transitions between Follower, Candidate, and Leader nodes alongside replicated write-ahead log (WAL) commit propagation.',
        captionAr:
          'الشكل 4: آلة الحالة لخوارزمية الإجماع الموزع (Raft) وتوضح انتقال العقد بين حالات التابع والمرشح والقائد مع نسخ سجل العمليات الموزع.',
        localUri: 'schematic://raft_consensus',
        svgDiagramKey: 'raft_consensus',
        anchorBlockId: 'bytebook_cs_ai_masterpiece_ch_2_blk_1',
      },
      {
        id: 'bytebook_cs_ai_masterpiece_fig_5',
        bookId: 'bytebook_cs_ai_masterpiece',
        chapterId: 'bytebook_cs_ai_masterpiece_ch_2',
        figureNumber: '5',
        normalizedKeys: ['5', 'fig.5', 'figure 5', 'fig 5', 'شكل 5'],
        title: 'Figure 5: B+Tree Page Split & LSM-Tree Compaction',
        caption:
          'Figure 5: Comparison of read-optimized B+Tree internal routing pages with leaf pointer chains against write-optimized Log-Structured Merge (LSM) SSTable levels.',
        captionAr:
          'الشكل 5: مقارنة معمارية بين شجرة B+Tree المحسنة للقراءة السريعة عبر المؤشرات المتسلسلة، وهيكل LSM-Tree المحسن للكتابة الكثيفة.',
        localUri: 'schematic://btree_storage',
        svgDiagramKey: 'btree_storage',
        anchorBlockId: 'bytebook_cs_ai_masterpiece_ch_2_blk_2',
      },
      {
        id: 'bytebook_cs_ai_masterpiece_fig_6',
        bookId: 'bytebook_cs_ai_masterpiece',
        chapterId: 'bytebook_cs_ai_masterpiece_ch_3',
        figureNumber: '6',
        normalizedKeys: ['6', 'fig.6', 'figure 6', 'fig 6', 'شكل 6'],
        title: 'Figure 6: Zero-Knowledge Arithmetic Circuit & Verifier',
        caption:
          'Figure 6: Prover polynomial commitment over finite fields verified succinctly by a stateless verifier without revealing private witness inputs.',
        captionAr:
          'الشكل 6: الدائرة الحسابية لإثبات المعرفة الصفرية (Zero-Knowledge Proof) حيث يتحقق المدقق من صحة البرهان الرياضي دون كشف البيانات السرية.',
        localUri: 'schematic://zk_proof_circuit',
        svgDiagramKey: 'zk_proof_circuit',
        anchorBlockId: 'bytebook_cs_ai_masterpiece_ch_3_blk_1',
      },
    ],
    rawChapters: [
      {
        title: 'Chapter 1: Transformer Attention & Memory Hierarchies',
        paragraphs: [
          {
            text: 'Chapter 1: Transformer Attention & Memory Hierarchies',
            translationAr: 'الفصل الأول: آليات الانتباه في المحولات (Transformers) والهرمية المعمارية للذاكرة',
            simplifiedConceptAr:
              'يشرح هذا الفصل كيف تركز نماذج الذكاء الاصطناعي الحديثة على الكلمات المهمة في الجملة، وكيف تتغلب على عنق الزجاجة في ذاكرة المعالجات الرسومية.',
          },
          {
            text: 'Modern large language models abandon sequential recurrence in favor of parallel self-attention. As illustrated in [1], the Scaled Dot-Product Attention kernel computes compatibility scores between Query and Key vectors before aggregating contextual Value representations across all tokens simultaneously.',
            attachedFigureIds: ['bytebook_cs_ai_masterpiece_fig_1'],
            translationAr:
              'تتخلى النماذج اللغوية الكبيرة الحديثة عن التكرار التسلسلي لصالح الانتباه الذاتي المتوازي. وكما هو موضح في [1]، تحسب نواة الانتباه الموزون بحاصل الضرب النقطي درجات التوافق بين متجهات الاستعلام (Query) والمفتاح (Key) قبل تجميع تمثيلات القيمة (Value) السياقية عبر جميع الرموز في وقت واحد.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: بدلاً من قراءة الجملة كلمةً تلو الأخرى ببطء، تقوم آلية الانتباه (Attention) بمقارنة كل كلمة بجميع الكلمات الأخرى دفعة واحدة لمعرفة العلاقات بينها (مثلاً: على من يعود الضمير في الجملة).',
          },
          {
            text: 'However, standard self-attention suffers from quadratic memory complexity with respect to sequence length. By inspecting Figure 2, systems architects can observe why naive intermediate matrix materialization saturates High-Bandwidth Memory (HBM), whereas hardware-aware tiling keeps active blocks inside ultra-fast on-chip SRAM.',
            attachedFigureIds: ['bytebook_cs_ai_masterpiece_fig_2'],
            translationAr:
              'ومع ذلك، يعاني الانتباه الذاتي القياسي من تعقيد تربيعي في استهلاك الذاكرة بالنسبة لطول النص. ومن خلال فحص الشكل Figure 2، يمكن لمهندسي الأنظمة ملاحظة سبب قيام التخزين الوسيط الساذج للمصفوفات بإشباع ذاكرة النطاق العالي (HBM)، بينما يحافظ التقسيم الواعي بالعتاد (Tiling) على الكتل النشطة داخل ذاكرة SRAM الفائقة السرعة على الشريحة.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: نقل البيانات بين المعالج والذاكرة الخارجية بطيء ومكلف؛ لذا تقوم خوارزميات مثل FlashAttention بتقسيم الحسابات إلى قطع صغيرة تُنجز بالكامل داخل الذاكرة الداخلية السريعة جداً (SRAM) دون الذهاب والعودة للذاكرة البطيئة.',
          },
          {
            text: 'When scaling autoregressive inference across long documents, Key-Value (KV) caching prevents redundant recomputation of historical tokens. Compare the tensor routing in [1] with the bandwidth constraints in Figure 2 to understand why quantization to 8-bit integers nearly doubles token generation throughput.',
            translationAr:
              'عند توسيع نطاق الاستنتاج التوليدي عبر المستندات الطويلة، يمنع التخزين المؤقت للمفاتيح والقيم (KV Cache) إعادة الحساب المتكرر للرموز السابقة. قارن بين توجيه الموترات في [1] وقيود عرض النطاق في Figure 2 لتفهم لماذا يؤدي التكميم الرقمي (Quantization) إلى أعداد صحيحة بحجم 8-بت إلى مضاعفة سرعة توليد الكلمات تقريباً.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: تقليص حجم الأرقام المخزنة من 16-بت إلى 8-بت يقلل حجم البيانات المنقولة للنصف، مما يجعل النموذج يكتب الإجابات بضعف السرعة تقريباً.',
          },
        ],
      },
      {
        title: 'Chapter 2: Just-In-Time (JIT) Compilers & Bytecode VMs',
        paragraphs: [
          {
            text: 'Chapter 2: Just-In-Time (JIT) Compilers & Bytecode VMs',
            translationAr: 'الفصل الثاني: المترجمات الفورية أثناء التشغيل (JIT) والآلات الافتراضية للبايت كود',
            simplifiedConceptAr:
              'يستعرض هذا الفصل كيف تعمل لغات مثل JavaScript و Java و Python بسرعة عالية عبر دمج التفسير السريع بالترجمة الذكية إلى لغة الآلة أثناء التشغيل.',
          },
          {
            text: 'High-performance runtime environments bridge the gap between portable interpretation and native execution speed. As depicted in Fig. 3, the parser first transforms source tokens into an Abstract Syntax Tree (AST) before emitting compact register-based bytecode for immediate startup execution.',
            attachedFigureIds: ['bytebook_cs_ai_masterpiece_fig_3'],
            translationAr:
              'تجسر بيئات التشغيل عالية الأداء الفجوة بين التفسير المحمول وسرعة التنفيذ الأصلي للعتاد. وكما هو مرسوم في Fig. 3، يحول المحلل أولاً رموز الكود المصدري إلى شجرة البنية المجردة (AST) قبل إصدار كود وسيط مضغوط (Bytecode) للتشغيل الفوري.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: بدلاً من ترجمة البرنامج بالكامل قبل تشغيله (مما يستغرق وقتاً طويلاً)، يبدأ المحرك بتشغيل نسخة خفيفة فوراً، ثم يراقب الأجزاء التي تتكرر كثيراً ليترجمها إلى أسرع صيغة ممكنة للمعالج.',
          },
          {
            text: 'During execution, an inline runtime profiler monitors branch frequencies and dynamic type shapes (3). Once a loop exceeds the hotness threshold shown in [3], the optimizing compiler performs speculative type specialization and dead-code elimination, falling back via deoptimization bailouts if type assumptions are violated.',
            translationAr:
              'أثناء التنفيذ، يراقب محلل الأداء المدمج تكرار التفرعات وأشكال الأنواع الديناميكية (3). وبمجرد أن تتجاوز الحلقة البرمجية عتبة السخونة الموضحة في [3]، يقوم المترجم المحسّن بتخصيص الأنواع التخميني وحذف الكود الميت، مع التراجع الآمن (Bailout) إذا تغيرت أنواع البيانات بشكل مفاجئ.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: يفترض المترجم الذكي أن المتغير الذي كان رقماً في أول 100 مرة سيبقى رقماً، فيبني مساراً فائق السرعة للأرقام فقط؛ وإذا فاجأه المبرمج بنص، يعود بأمان للمسار العادي دون أن ينهار البرنامج.',
          },
        ],
      },
      {
        title: 'Chapter 3: Distributed Consensus & Storage Engines',
        paragraphs: [
          {
            text: 'Chapter 3: Distributed Consensus & Storage Engines',
            translationAr: 'الفصل الثالث: خوارزميات الإجماع الموزع ومحركات قواعد البيانات',
            simplifiedConceptAr:
              'يشرح هذا الفصل كيف تتفق عدة خوادم حول العالم على نفس البيانات حتى لو تعطل بعضها، وكيف تُحفظ البيانات على الأقراص الصلبة.',
          },
          {
            text: 'Fault-tolerant distributed databases rely on deterministic state machine replication to survive network partitions. In the Raft consensus protocol illustrated in (4) and Figure 4, a single elected Leader serializes client mutations into a replicated log and commits entries once a majority quorum acknowledges persistence.',
            attachedFigureIds: ['bytebook_cs_ai_masterpiece_fig_4'],
            translationAr:
              'تعتمد قواعد البيانات الموزعة المقاومة للأعطال على نسخ آلة الحالة الحتمية للصمود أمام انقطاعات الشبكة. وفي بروتوكول الإجماع Raft الموضح في (4) والشكل Figure 4، يقوم قائد واحد منتخب بترتيب تعديلات العملاء في سجل منسوخ، ويعتمد العمليات بمجرد تأكيد الأغلبية (Quorum) لحفظها.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: لضمان عدم تضارب البيانات بين 5 خوادم، ينتخبون "قائداً" واحداً يستقبل التعديلات؛ ولا تُعتبر المعلومة محفوظة رسمياً إلا إذا وافق عليها 3 خوادم على الأقل (الأغلبية).',
          },
          {
            text: 'Beneath the consensus layer, local storage engines balance read latency against write amplification. Refer to Figure 5 and [5] to compare how in-place B+Tree page updates differ from append-only Log-Structured Merge (LSM) trees that flush sorted MemTables into immutable SSTables.',
            attachedFigureIds: ['bytebook_cs_ai_masterpiece_fig_5'],
            translationAr:
              'تحت طبقة الإجماع، توازن محركات التخزين المحلية بين زمن استجابة القراءة وتضخم الكتابة. راجع Figure 5 والمرجع [5] للمقارنة بين كيفية عمل تحديثات صفحات B+Tree في مكانها مقابل أشجار الدمج الهيكلية (LSM-Tree) التي تكتب البيانات تتابعياً في جداول غير قابلة للتعديل (SSTables).',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: شجرة B+Tree تشبه فهرس كتاب مرتب يسهل البحث فيه فوراً، بينما شجرة LSM تشبه تدوين الملاحظات بسرعة في دفتر مسودة ثم ترتيبها لاحقاً في الخلفية لكي لا تتعطل سرعة الكتابة.',
          },
        ],
      },
      {
        title: 'Chapter 4: Zero-Knowledge Proofs & Cryptographic Verification',
        paragraphs: [
          {
            text: 'Chapter 4: Zero-Knowledge Proofs & Cryptographic Verification',
            translationAr: 'الفصل الرابع: إثباتات المعرفة الصفرية والتحقق التشفيري',
            simplifiedConceptAr:
              'يشرح هذا الفصل كيف يمكنك إثبات أنك تملك معلومة صحيحة أو كلمة سر أو رصيداً مالياً لطرف آخر رياضياً دون أن تكشف له المعلومة نفسها.',
          },
          {
            text: 'Succinct Non-Interactive Arguments of Knowledge (zk-SNARKs) allow an untrusted prover to convince a verifier that a computation was executed faithfully without revealing private inputs. As shown in [6] and Figure 6, the computation is flattened into an arithmetic circuit over a finite field where polynomial constraints must vanish.',
            attachedFigureIds: ['bytebook_cs_ai_masterpiece_fig_6'],
            translationAr:
              'تسمح براهين المعرفة الموجزة غير التفاعلية (zk-SNARKs) لطرف مُثبِت بإقناع المدقق بأن عملية حسابية قد نُفذت بأمانة دون كشف المدخلات السرية. وكما يظهر في [6] والشكل Figure 6، يتم تسطيح العملية الحسابية إلى دائرة جبرية فوق حقل منتهٍ حيث يجب أن تتحقق قيود كثيرات الحدود بدقة.',
            simplifiedConceptAr:
              'تبسيط المفهوم العلمي: تحول هذه التقنية أي برنامج حاسوبي إلى معادلة رياضية؛ يستطيع الخادم تقديم "شهادة رقمية صغيرة جداً" تثبت أن المعادلة حُلّت بشكل صحيح 100% في أجزاء من المللي ثانية دون كشف الأرقام السرية الداخلة فيها.',
          },
        ],
      },
    ],
  },
];
