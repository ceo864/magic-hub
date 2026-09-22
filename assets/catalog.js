/* Magic Hub — каталог бази знань.
   Єдине місце, де вирішується, в якій категорії лежить документ і в якому модулі онбордингу він іде.
   Щоб додати документ: 1) опиши його в DOCS, 2) додай шлях у групу категорії, 3) за потреби — у модуль COURSE.
   Шляхи — від кореня репозиторію. Папка з index.html пишеться зі слешем у кінці. */
window.HUB = (function () {
  var DOCS = {
    // Про агенцію
    'about-magic/':                          { t: 'Хто ми', d: 'Що робимо, для кого, чим відрізняємось і які результати дали клієнтам' },
    'magic-sop-framework-uam/':              { t: 'Magic Framework', d: 'Методологія: філософія, 4 стовпи, робочий цикл, інструменти' },
    'growth_base/pre-launch-flow.html':      { t: 'Magic Pre-Launch System', d: 'Discovery → Growth Blueprint → Setup Month: як готуємо клієнта до запуску' },

    // Growth Marketer
    'growth-marketer/':                      { t: 'Регламент ролі Growth Marketer', d: 'Посадова інструкція, взаємодія в команді, звітність' },
    'growth-development/':                   { t: 'Розвиток Growth Marketer', d: 'Карта розвитку ролі: моделі, кар\'єрні сходи, навчання' },
    'growth-levels/':                        { t: 'Кар\'єрні сходи', d: 'Intern → Junior → Middle → Senior → Lead і вимоги до переходу' },
    'growth-report/':                        { t: 'Growth Report', d: 'Звітна зустріч Growth Marketer із CEO' },
    'magic-agenda_growth/':                  { t: 'Агенда Growth-синку', d: 'Формат і правила робочої зустрічі' },
    'growth-dashboard/':                     { t: 'Growth Dashboard', d: 'Звідки береться кожне число на борді і як воно рахується' },
    'growth_base/growth-matrix.html':        { t: 'Матриця компетенцій', d: '10 напрямків і рівні володіння кожним' },
    'growth_base/growth-diagnostic.html':    { t: 'Діагностика знань', d: 'Тест на 36 питань і практичні завдання для самоперевірки' },

    // Навички — Paid Ads
    'paid-meta/':                            { t: 'Meta Ads', d: 'Роль каналу, алгоритм, структура, креативи і метрики Meta' },
    'paid-tiktok/':                          { t: 'TikTok Ads', d: 'Роль каналу, алгоритм, структура, креативи і метрики TikTok' },
    'paid-google/':                          { t: 'Google Ads', d: 'Search, Shopping, Performance Max і товарний фід' },
    'magic-decision-tree-campaign-structure/': { t: 'Структура кампаній', d: 'Дерево рішень для Meta і TikTok Ads' },
    'magic-platform-specs-cheatsheet/':      { t: 'Специфікації платформ', d: 'Розміри й формати креативів під кожну платформу' },
    // Навички — Креативи
    'magic-creative-production-sop/':        { t: 'Продакшн креативів', d: 'Від гіпотези до висновку: 6 кроків' },
    'magic-sop-creative-testing/':           { t: 'Тестування креативів', d: 'Як ставимо і читаємо тести гіпотез' },
    'magic-creative-angles-playbook/':       { t: 'Креативні кути', d: 'Бібліотека кутів і концепцій для креативів' },
    'magic-sop-inspiration-playbook-/':      { t: 'Пошук інсайтів', d: 'Де шукати референси і як зробити це рутиною' },
    'magic-creative-checklists/':            { t: 'Чеклісти креативів', d: 'Бриф, перевірка перед запуском і після' },
    'magic-decision-matrix-creative-fatigue/': { t: 'Втома креативів', d: 'Сигнали, пороги і що міняти першим' },
    // Навички — Retention
    'retention/':                            { t: 'Retention-маркетинг', d: 'Email, повторні покупки, автоматичні ланцюжки, LTV' },
    'growth_base/rfm-guide.html':            { t: 'RFM-аналіз', d: 'Сегментація бази клієнтів з тренажером' },
    // Навички — Маркетинг і моделі
    'growth-models/':                        { t: 'Пак моделей', d: 'Ситуація → модель → дія: маркетинг, менеджмент, бренди' },
    'growth_base/marketing-models-guide.html': { t: 'Маркетингові моделі', d: 'Як RACE, JTBD і сходи обізнаності складаються в систему' },
    'magic-awareness-ladder/':               { t: 'Сходи обізнаності', d: '5 щаблів Бена Ханта і меседж під кожен' },
    'growth_base/ice-pie-guide.html':        { t: 'ICE та PIE', d: 'Пріоритезація гіпотез з калькулятором' },
    'growth_base/dtc-best-practices.html':   { t: 'Практики DTC-брендів', d: 'Головна, картка товару і кошик на прикладах' },
    'growth_base/ecommerce-checklist.html':  { t: 'Аудит e-commerce сайту', d: '42 пункти з пріоритетами для кожного проєкту' },
    // Навички — Менеджмент
    'growth_base/eisenhower-matrix.html':    { t: 'Матриця Ейзенхауера', d: 'Щоденна пріоритезація: важливо проти термінового' },
    'growth-models/#management':             { t: 'Kanban, OKR і дошка в Asana', d: 'Як організовуємо власну роботу і проєкти' },
    // Навички — Психологія
    'psychology/':                           { t: 'Психологія покупки', d: 'Принципи впливу і когнітивні упередження в e-commerce' },

    // Файли та шаблони
    'growth_base/strategy-template-doc.html':          { t: 'Шаблон стратегії', d: 'Робочий документ, який заповнюється під проєкт' },
    'growth_base/strategy-template-presentation.html': { t: 'Шаблон презентації стратегії', d: '13 слайдів для захисту стратегії перед клієнтом' },
    'how-to-write/':                         { t: 'Як писати повідомлення', d: 'Клієнту і команді: головне першим рядком, цифри, чітке прохання' },
    'magic-vysnovky-u-zvitakh/':             { t: 'Висновки у звітах', d: 'Як писати висновки, після яких клієнт діє' },
    'how-to-meet/':                          { t: 'Як проводити зустрічі', d: 'Агенда, ролі, рішення і фоллоу-ап' },
    'tools/':                                { t: 'Софт і доступи', d: 'З якими сервісами працюємо і для чого кожен' },
    'growth_base/glossary.html':             { t: 'Глосарій', d: 'Усі терміни Growth і e-commerce в одному місці, з пошуком' },
    'ext:competency-pdf':                    { t: 'Матриця компетенцій (PDF)', d: 'Версія для друку в Google Drive', href: 'https://drive.google.com/file/d/1KpJs2HwMiD959-yVUXJp5OPhChuLFg0q/view' }
  };

  var CATS = [
    { id: 'about', title: 'Про агенцію', icon: 'building',
      desc: 'Хто ми, як працюємо з клієнтами і на чому стоїть методологія',
      groups: [
        { title: 'Хто ми', items: ['about-magic/'] },
        { title: 'Методологія', items: ['magic-sop-framework-uam/', 'growth_base/pre-launch-flow.html'] }
      ] },
    { id: 'growth', title: 'Growth Marketer', icon: 'compass',
      desc: 'Роль, розвиток, зустрічі і самоперевірка',
      groups: [
        { title: 'Роль і розвиток', items: ['growth-marketer/', 'growth-development/', 'growth-levels/'] },
        { title: 'Зустрічі та звітність', items: ['growth-report/', 'magic-agenda_growth/', 'growth-dashboard/'] },
        { title: 'Самоперевірка', items: ['growth_base/growth-diagnostic.html', 'growth_base/growth-matrix.html'] }
      ] },
    { id: 'skills', title: 'Навички', icon: 'layers',
      desc: 'Paid Ads, креативи, retention, маркетинг, менеджмент і психологія',
      groups: [
        { title: 'Paid Ads', items: ['paid-meta/', 'paid-tiktok/', 'paid-google/', 'magic-decision-tree-campaign-structure/', 'magic-platform-specs-cheatsheet/'] },
        { title: 'Креативи', items: ['magic-creative-production-sop/', 'magic-sop-creative-testing/', 'magic-creative-angles-playbook/', 'magic-sop-inspiration-playbook-/', 'magic-creative-checklists/', 'magic-decision-matrix-creative-fatigue/'] },
        { title: 'Retention', items: ['retention/', 'growth_base/rfm-guide.html'] },
        { title: 'Маркетинг і моделі', items: ['growth-models/', 'growth_base/marketing-models-guide.html', 'magic-awareness-ladder/', 'growth_base/ice-pie-guide.html', 'growth_base/dtc-best-practices.html', 'growth_base/ecommerce-checklist.html'] },
        { title: 'Менеджмент', items: ['growth_base/eisenhower-matrix.html', 'growth-models/#management'] },
        { title: 'Психологія', items: ['psychology/'] }
      ] },
    { id: 'hr', title: 'HR', icon: 'users',
      desc: 'Відпустки, лікарняні, day off, звільнення та інші правила роботи в агенції',
      groups: [] },
    { id: 'files', title: 'Файли та шаблони', icon: 'folder',
      desc: 'Шаблони, правила комунікації, зустрічі, софт і довідники',
      groups: [
        { title: 'Шаблони', items: ['growth_base/strategy-template-doc.html', 'growth_base/strategy-template-presentation.html', 'ext:competency-pdf'] },
        { title: 'Як писати', items: ['how-to-write/', 'magic-vysnovky-u-zvitakh/'] },
        { title: 'Зустрічі', items: ['how-to-meet/'] },
        { title: 'Софт', items: ['tools/'] },
        { title: 'Довідники', items: ['growth_base/glossary.html'] }
      ] }
  ];

  /* Онбординг: однаковий шлях для всієї команди. Порядок модулів = порядок проходження. */
  var COURSE = [
    { title: 'Про Magic', when: 'День 1', goal: 'Розумію, що робить агенція, для кого і чим ми відрізняємось.',
      items: ['about-magic/', 'magic-sop-framework-uam/', 'growth_base/pre-launch-flow.html'] },
    { title: 'Моя роль', when: 'День 1–2', goal: 'Знаю, за що відповідаю, як мене оцінюють і куди рости.',
      items: ['growth-marketer/', 'growth-development/', 'growth-levels/', 'growth_base/glossary.html'] },
    { title: 'Як ми працюємо', when: 'Тиждень 1', goal: 'Пишу, зустрічаюсь і веду задачі так, як прийнято в команді.',
      items: ['how-to-write/', 'how-to-meet/', 'tools/', 'growth-report/', 'magic-agenda_growth/'] },
    { title: 'Цифри', when: 'Тиждень 1', goal: 'Читаю борд і пишу висновки, після яких клієнт діє.',
      items: ['growth-dashboard/', 'magic-vysnovky-u-zvitakh/'] },
    { title: 'Paid Ads', when: 'Тиждень 2', goal: 'Розумію роль кожного каналу і як будуємо кампанії.',
      items: ['paid-meta/', 'paid-tiktok/', 'paid-google/', 'magic-decision-tree-campaign-structure/', 'magic-platform-specs-cheatsheet/'] },
    { title: 'Креативи', when: 'Тиждень 2', goal: 'Можу пройти шлях від гіпотези до висновку по креативу.',
      items: ['magic-creative-production-sop/', 'magic-sop-creative-testing/', 'magic-creative-angles-playbook/', 'magic-sop-inspiration-playbook-/', 'magic-creative-checklists/', 'magic-decision-matrix-creative-fatigue/'] },
    { title: 'Маркетинг і retention', when: 'Тиждень 3', goal: 'Застосовую моделі і працюю з базою клієнтів.',
      items: ['growth-models/', 'growth_base/marketing-models-guide.html', 'magic-awareness-ladder/', 'psychology/', 'growth_base/ice-pie-guide.html', 'retention/', 'growth_base/rfm-guide.html', 'growth_base/dtc-best-practices.html', 'growth_base/ecommerce-checklist.html', 'growth_base/eisenhower-matrix.html'] },
    { title: 'Самоперевірка', when: 'Тиждень 4', goal: 'Бачу свій рівень і прогалини, з якими йду до CEO.',
      items: ['growth_base/growth-diagnostic.html', 'growth_base/growth-matrix.html'] }
  ];

  return { DOCS: DOCS, CATS: CATS, COURSE: COURSE };
})();
