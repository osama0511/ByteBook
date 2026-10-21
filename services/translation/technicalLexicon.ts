/**
 * ByteBook — Built-in Technical & Academic English Lexicon
 * Provides instant 0ms contextual Arabic translations, IPA phonetics,
 * technical explanations, and bilingual examples for specialized CS/AI terminology.
 */

export interface LexiconEntry {
  word: string;
  phonetic: string;
  contextualTranslationAr: string;
  lexicalMeaningAr: string;
  partOfSpeech: string;
  technicalExplanationAr: string;
  exampleSentenceEn: string;
  exampleSentenceAr: string;
}

export const TECHNICAL_LEXICON: Record<string, LexiconEntry> = {
  attention: {
    word: 'attention',
    phonetic: '/əˈten.ʃən/',
    contextualTranslationAr: 'آلية الانتباه (في الشبكات العصبية)',
    lexicalMeaningAr: 'انتباه / تركيز',
    partOfSpeech: 'Noun (Technical Term)',
    technicalExplanationAr:
      'تقنية رياضية في نماذج Transformer تحدد مدى ارتباط كل كلمة بالكلمات الأخرى في النص.',
    exampleSentenceEn: 'Multi-head attention captures long-range dependencies across sentences.',
    exampleSentenceAr: 'يلتقط الانتباه متعدد الرؤوس العلاقات بعيدة المدى عبر الجمل.',
  },
  sequential: {
    word: 'sequential',
    phonetic: '/sɪˈkwen.ʃəl/',
    contextualTranslationAr: 'تتابعي / تسلسلي',
    lexicalMeaningAr: 'متتالٍ خطوة بخطوة',
    partOfSpeech: 'Adjective',
    technicalExplanationAr:
      'معالجة البيانات عنصراً تلو الآخر بالترتيب، على عكس المعالجة المتوازية (Parallel).',
    exampleSentenceEn: 'Sequential processing limits GPU utilization during training.',
    exampleSentenceAr: 'تحد المعالجة التسلسلية من الاستفادة الكاملة من المعالج الرسومي أثناء التدريب.',
  },
  recurrence: {
    word: 'recurrence',
    phonetic: '/rɪˈkɜːr.əns/',
    contextualTranslationAr: 'التكرار العودي (في الشبكات المتكررة RNN)',
    lexicalMeaningAr: 'تكرار / معاودة الحدوث',
    partOfSpeech: 'Noun',
    technicalExplanationAr:
      'اعتماد الخطوة الحسابية الحالية على مخرجات الخطوة السابقة مباشرة.',
    exampleSentenceEn: 'Transformers eliminated recurrence to enable massive parallelization.',
    exampleSentenceAr: 'ألغت نماذج المحولات التكرار العودي لتمكين التوازي الهائل.',
  },
  parallel: {
    word: 'parallel',
    phonetic: '/ˈpær.ə.lel/',
    contextualTranslationAr: 'متوازٍ / متزامن',
    lexicalMeaningAr: 'موازٍ / في آنٍ واحد',
    partOfSpeech: 'Adjective',
    technicalExplanationAr:
      'تنفيذ آلاف العمليات الحسابية في نفس اللحظة عبر أنوية المعالج الرسومي.',
    exampleSentenceEn: 'Parallel matrix multiplication accelerates model training.',
    exampleSentenceAr: 'يسرّع ضرب المصفوفات المتوازي من تدريب النموذج.',
  },
  kernel: {
    word: 'kernel',
    phonetic: '/ˈkɜːr.nəl/',
    contextualTranslationAr: 'نواة حسابية مخصصة (GPU Kernel)',
    lexicalMeaningAr: 'نواة / لبّ',
    partOfSpeech: 'Noun (Systems)',
    technicalExplanationAr:
      'دالة برمجية منخفضة المستوى تُنفذ مباشرة وبالتوازي على آلاف أنوية المعالج الرسومي (GPU).',
    exampleSentenceEn: 'The fused CUDA kernel minimizes memory round-trips.',
    exampleSentenceAr: 'تقلل النواة الحسابية المدمجة من رحلات الذهاب والعودة للذاكرة.',
  },
  compatibility: {
    word: 'compatibility',
    phonetic: '/kəmˌpæt.əˈbɪl.ə.ti/',
    contextualTranslationAr: 'درجة التوافق والترابط',
    lexicalMeaningAr: 'توافق / انسجام',
    partOfSpeech: 'Noun',
    technicalExplanationAr:
      'مدى التشابه الدلالي بين متجه الاستعلام (Query) ومتجه المفتاح (Key).',
    exampleSentenceEn: 'The dot product measures compatibility between two embedding vectors.',
    exampleSentenceAr: 'يقيس حاصل الضرب النقطي درجة التوافق بين متجهين مضمنين.',
  },
  quadratic: {
    word: 'quadratic',
    phonetic: '/kwɑːˈdræt.ɪk/',
    contextualTranslationAr: 'تربيعي التسارع O(N²)',
    lexicalMeaningAr: 'من الدرجة الثانية (تربيعي)',
    partOfSpeech: 'Adjective (Mathematics)',
    technicalExplanationAr:
      'إذا تضاعف طول النص مرتين، تزداد التكلفة الحسابية 4 مرات (مربع الطول).',
    exampleSentenceEn: 'Quadratic complexity becomes prohibitive for million-token books.',
    exampleSentenceAr: 'يصبح التعقيد التربيعي عائقاً كبيراً عند معالجة الكتب المليونية.',
  },
  bandwidth: {
    word: 'bandwidth',
    phonetic: '/ˈbænd.wɪdθ/',
    contextualTranslationAr: 'عرض نطاق نقل البيانات',
    lexicalMeaningAr: 'سعة النطاق / معدل النقل',
    partOfSpeech: 'Noun (Hardware)',
    technicalExplanationAr:
      'كمية البيانات (بالجيجابايت أو التيرابايت) التي يمكن نقلها بين الذاكرة والمعالج في الثانية الواحدة.',
    exampleSentenceEn: 'Memory bandwidth is often the primary bottleneck in LLM inference.',
    exampleSentenceAr: 'غالباً ما يكون عرض نطاق الذاكرة هو عنق الزجاجة الرئيسي في استنتاج النماذج اللغوية.',
  },
  tiling: {
    word: 'tiling',
    phonetic: '/ˈtaɪ.lɪŋ/',
    contextualTranslationAr: 'التقسيم الكتلي (Memory Tiling)',
    lexicalMeaningAr: 'تبليط / تقسيم إلى مربعات',
    partOfSpeech: 'Noun (Optimization)',
    technicalExplanationAr:
      'تقسيم المصفوفات الضخمة إلى مربعات صغيرة تناسب ذاكرة المعالج السريعة جداً (SRAM).',
    exampleSentenceEn: 'Loop tiling dramatically improves cache locality on modern CPUs and GPUs.',
    exampleSentenceAr: 'يحسّن التقسيم الكتلي للحلقات كفاءة الذاكرة المخبئية بشكل هائل.',
  },
  quantization: {
    word: 'quantization',
    phonetic: '/ˌkwɑːn.təˈzeɪ.ʃən/',
    contextualTranslationAr: 'التكميم الرقمي (تقليص دقة الأوزان)',
    lexicalMeaningAr: 'تكميم / تحويل لقيم محددة',
    partOfSpeech: 'Noun (AI Systems)',
    technicalExplanationAr:
      'ضغط أوزان النموذج من أعداد عشرية كبيرة (32-bit/16-bit) إلى أعداد صحيحة صغيرة (8-bit/4-bit) لتسريع التشغيل وتوفير الذاكرة.',
    exampleSentenceEn: '8-bit quantization reduces memory footprint by half with minimal accuracy loss.',
    exampleSentenceAr: 'يقلل التكميم بحجم 8-بت استهلاك الذاكرة للنصف مع فقدان ضئيل جداً في الدقة.',
  },
  throughput: {
    word: 'throughput',
    phonetic: '/ˈθruː.pʊt/',
    contextualTranslationAr: 'معدل الإنتاجية (عدد العمليات في الثانية)',
    lexicalMeaningAr: 'الإنتاجية / التدفق الكلي',
    partOfSpeech: 'Noun',
    technicalExplanationAr:
      'إجمالي عدد الرموز أو الطلبات التي ينجزها النظام في الثانية الواحدة.',
    exampleSentenceEn: 'Batching requests increases overall server throughput.',
    exampleSentenceAr: 'يؤدي تجميع الطلبات إلى زيادة الإنتاجية الكلية للخادم.',
  },
  bytecode: {
    word: 'bytecode',
    phonetic: '/ˈbaɪt.koʊd/',
    contextualTranslationAr: 'الكود الوسيط (Bytecode)',
    lexicalMeaningAr: 'شفرة بايتية وسيطة',
    partOfSpeech: 'Noun (Compilers)',
    technicalExplanationAr:
      'تمثيل رقمي مضغوط للكود البرمجي تنفذه الآلة الافتراضية (VM) بسرعة أكبر من قراءة النص الخام.',
    exampleSentenceEn: 'The compiler translates source files into portable bytecode.',
    exampleSentenceAr: 'يترجم المصرّف ملفات المصدر إلى كود وسيط محمول.',
  },
  profiler: {
    word: 'profiler',
    phonetic: '/ˈproʊ.faɪ.lər/',
    contextualTranslationAr: 'محلل الأداء الفوري (Runtime Profiler)',
    lexicalMeaningAr: 'مراقب الأداء',
    partOfSpeech: 'Noun',
    technicalExplanationAr:
      'مكون يراقب البرنامج أثناء عمله لاكتشاف الدوال والحلقات الأكثر استهلاكاً للوقت.',
    exampleSentenceEn: 'The profiler identified a hot loop that consumed 80% of CPU time.',
    exampleSentenceAr: 'اكتشف محلل الأداء حلقة ساخنة تستهلك 80% من وقت المعالج.',
  },
  speculative: {
    word: 'speculative',
    phonetic: '/ˈspek.jə.lə.tɪv/',
    contextualTranslationAr: 'تخميني / استباقي',
    lexicalMeaningAr: 'افتراضي / مبني على التوقع',
    partOfSpeech: 'Adjective',
    technicalExplanationAr:
      'تنفيذ تحسينات برمجية بناءً على توقع سلوك الكود الأكثر احتمالاً استناداً لسجله السابق.',
    exampleSentenceEn: 'Speculative optimization speeds up dynamically typed languages.',
    exampleSentenceAr: 'يسرّع التحسين الاستباقي اللغات ذات الأنواع الديناميكية.',
  },
  consensus: {
    word: 'consensus',
    phonetic: '/kənˈsen.səs/',
    contextualTranslationAr: 'الإجماع الموزع (Distributed Consensus)',
    lexicalMeaningAr: 'إجماع / توافق الآراء',
    partOfSpeech: 'Noun (Distributed Systems)',
    technicalExplanationAr:
      'خوارزمية تضمن اتفاق مجموعة من الخوادم المنفصلة على نفس القيمة أو الترتيب حتى لو فشل بعضها.',
    exampleSentenceEn: 'Raft and Paxos are foundational consensus protocols.',
    exampleSentenceAr: 'يُعد كل من Raft و Paxos من بروتوكولات الإجماع الأساسية.',
  },
  quorum: {
    word: 'quorum',
    phonetic: '/ˈkwɔːr.əm/',
    contextualTranslationAr: 'النصاب القانوني للأغلبية (Quorum)',
    lexicalMeaningAr: 'نصاب الأغلبية',
    partOfSpeech: 'Noun',
    technicalExplanationAr:
      'الحد الأدنى من الخوادم (عادة النصف + 1) الذي يجب أن يصوت بالموافقة لاعتماد عملية كتابة في النظام الموزع.',
    exampleSentenceEn: 'A cluster of five nodes requires a quorum of three to commit writes.',
    exampleSentenceAr: 'يتطلب عنقود من خمس عقد نصاباً من ثلاث عقد لاعتماد عمليات الكتابة.',
  },
  immutable: {
    word: 'immutable',
    phonetic: '/ɪˈmjuː.tə.bəl/',
    contextualTranslationAr: 'غير قابل للتعديل (Immutable)',
    lexicalMeaningAr: 'ثابت / لا يتغير',
    partOfSpeech: 'Adjective',
    technicalExplanationAr:
      'بيانات أو ملفات تُكتب مرة واحدة ولا تُعدّل في مكانها أبداً، مما يمنع التضارب ويسرع القراءة المتوازية.',
    exampleSentenceEn: 'SSTables on disk are completely immutable once flushed.',
    exampleSentenceAr: 'تكون جداول SSTable على القرص غير قابلة للتعديل تماماً بمجرد كتابتها.',
  },
  verifier: {
    word: 'verifier',
    phonetic: '/ˈver.ə.faɪ.ər/',
    contextualTranslationAr: 'المدقق الرياضي (Verifier)',
    lexicalMeaningAr: 'المتحقق / الفاحص',
    partOfSpeech: 'Noun (Cryptography)',
    technicalExplanationAr:
      'الطرف الذي يفحص البرهان التشفيري في أجزاء من الثانية للتأكد من صحة الحساب دون إعادته.',
    exampleSentenceEn: 'The verifier checks the zero-knowledge proof in constant time.',
    exampleSentenceAr: 'يفحص المدقق برهان المعرفة الصفرية في زمن ثابت وفائق السرعة.',
  },
};
