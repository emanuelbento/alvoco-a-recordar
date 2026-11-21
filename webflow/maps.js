/* Prototype class names -> Client-First names used in Webflow.
   G    one name everywhere
   CTX  [old, context, new]: old becomes new when an ancestor (or the element itself) has `context`
   ADD  [selector, class]: elements matched by the old selector get a class of their own,
        and the selector is rewritten to that class in the stylesheet and the script
   RAW  selector text rewritten as is, before anything else */

const G = {
  // structure and utilities
  w: 'padding-global', g: 'layout-grid', sec: 'padding-section-large', 'sec-b': 'padding-section-bottom',
  'sec-a': 'margin-top-large', dk: 'background-color-dark', 'nt-bg': 'background-color-night',
  gr: 'background-color-green', p2: 'background-color-secondary', pp: 'background-color-primary',
  fs0: 'fieldset-reset', d1: 'heading-style-h1', d2: 'heading-style-h2', d3: 'heading-style-h3',
  lede: 'text-size-large', big: 'text-size-xlarge', lb: 'text-style-label', prose: 'text-rich-text',
  vv: 'text-color-green', lk: 'text-style-link', ul: 'link-underline', lkb: 'button-reset',
  sr: 'visually-hidden', skip: 'skip-link', sel: 'text-select-all', ln: 'line-mask', btn: 'button',
  ph: 'image-wrapper', logo: 'site-logo', head: 'section-header', 'x-btn': 'button-close', 'st-cv': 'stars-canvas',
  // nav, menu
  nav: 'nav_component', 'nav-in': 'nav_bar', 'nav-l': 'nav_links', 'nav-a': 'nav_actions', burger: 'nav_burger',
  menu: 'menu_component',
  // transition, loader
  pt: 'transition_component', 'pt-a': 'transition_wipe', 'pt-b': 'transition_cover', 'pt-c': 'transition_content',
  'pt-m': 'transition_mark', 'pt-n': 'transition_name',
  ld: 'loader_component', 'ld-bg': 'loader_background', 'ld-logo': 'loader_logo', 'ld-svg': 'loader_svg',
  'ld-line': 'loader_line', 'ld-solid': 'loader_solid', 'ld-word': 'loader_word', 'ld-rect': 'loader_rect',
  'ld-b': 'loader_bottom', od: 'loader_count', 'od-c': 'loader_digit',
  // footer
  ft: 'footer_component', 'ft-mk': 'footer_mark', 'ft-top': 'footer_top', 'ft-t': 'footer_title',
  'ft-ridge': 'footer_ridge', 'ft-r0': 'footer_ridge-base', 'ft-r1': 'footer_ridge-light', 'ft-lamp': 'footer_lamp',
  'ft-cols': 'footer_columns', 'ft-b': 'footer_bottom', 'ft-lg': 'footer_legal', clock: 'footer_clock',
  // home
  hero: 'section_home-hero', 'hero-bg': 'home-hero_background', 'hero-fb': 'home-hero_ridges',
  'hero-gl': 'home-hero_canvas', 'hero-tag': 'home-hero_tag', 'hero-in': 'home-hero_content',
  'hero-k': 'home-hero_eyebrow', 'hero-f': 'home-hero_footer', 'hero-p': 'home-hero_text', 'hero-h': 'home-hero_hint',
  pn: 'section_picture', 'pn-f': 'picture_figure',
  mani: 'section_home-manifesto', 'mani-k': 'home-manifesto_label', 'mani-t': 'home-manifesto_text',
  'mani-f': 'home-manifesto_footer',
  tr: 'section_home-trail', 'tr-st': 'home-trail_sticky', 'tr-track': 'home-trail_track', 'tr-svg': 'home-trail_svg',
  'tr-base': 'home-trail_path-base', 'tr-prog': 'home-trail_path-light', 'tr-lamp': 'home-trail_lamp',
  'tr-ti': 'home-trail_intro', 'tr-sub': 'home-trail_subtitle', 'tr-lw': 'home-trail_list-wrap',
  'tr-v': 'home-trail_line', 'tr-ls': 'home-trail_list', 'tr-b': 'home-trail_item', 'tr-d': 'home-trail_dot',
  'tr-t': 'home-trail_text', 'tr-end': 'home-trail_end',
  nt: 'section_home-night', 'nt-st': 'home-night_sticky', 'nt-dawn': 'home-night_dawn', 'nt-r': 'home-night_ridge',
  'nt-in': 'home-night_content', 'nt-clock': 'home-night_clock', 'nt-row': 'home-night_row', 'nt-tx': 'home-night_text',
  yr: 'home-year_list', 'yr-i': 'home-year_item',
  rs: 'section_home-rostos', 'rs-row': 'home-rostos_row', 'rs-c': 'home-rostos_card', 'rs-m': 'home-rostos_meta',
  'rs-f': 'home-rostos_footer', 'rs-nav': 'home-rostos_nav', 'rs-b': 'home-rostos_arrow',
  ms: 'section_home-memory', 'ms-star': 'home-memory_star', 'ms-l': 'home-memory_label', 'ms-in': 'home-memory_content',
  'ms-p': 'home-memory_text', 'ms-h': 'home-memory_hint',
  // join and member card
  jn: 'section_join', 'jn-g': 'join_grid', 'jn-h': 'join_title', 'jn-l': 'join_left', 'jn-r': 'join_right',
  'jn-ul': 'join_list', 'jn-card': 'join_card', 'jn-f': 'join_form', 'jn-row': 'join_row', 'jn-p': 'join_prices',
  'jn-n': 'join_note',
  card3d: 'member-card_wrap', card: 'member-card_card', 'card-f': 'member-card_front', 'card-b': 'member-card_back',
  'c-n': 'member-card_number-value', 'c-nm': 'member-card_name', 'c-pl': 'member-card_place', rg: 'member-card_ridge',
  // drawer and form fields
  dw: 'drawer_component', 'dw-bg': 'drawer_backdrop', 'dw-p': 'drawer_panel', 'dw-s': 'drawer_side',
  'dw-k': 'drawer_label', 'dw-steps': 'drawer_steps', 'dw-fee': 'drawer_fee', 'dw-m': 'drawer_main',
  'dw-h': 'drawer_header', 'dw-pb': 'drawer_progress', 'dw-b': 'drawer_body', 'dw-f': 'drawer_footer',
  stp: 'drawer_step', back: 'drawer_back', next: 'drawer_next', fee: 'drawer_prices', rv: 'drawer_review',
  done: 'drawer_done', 'done-c': 'drawer_done-card', 'done-p': 'drawer_done-text', 'd-nome': 'drawer_done-name',
  'd-mail': 'drawer_done-mail',
  fm: 'form_grid', fl: 'form_field', bl: 'form_field-line', ck: 'form_field-check', er: 'form_field-error',
  hn: 'form_field-hint', 'dob-i': 'form_date', lg: 'form_legend', chips: 'form_chips', check: 'form_checkbox',
  bx: 'form_checkbox-box', mst: 'form_required', 'er-g': 'form_group-error',
};

const CTX = [
  ['top', 'menu', 'menu_top'], ['f', 'menu', 'menu_footer'],
  ['top', 'card-f', 'member-card_top'], ['num', 'card-f', 'member-card_number'],
  ['nm', 'card-f', 'member-card_holder'], ['pend', 'card-f', 'is-pending'], ['pend', 'done-c', 'is-pending'],
  ['act', 'ft-top', 'footer_cta'],
  ['ti', 'head', 'section-header_title'], ['in', 'head', 'section-header_intro'],
  ['d', 'hero-h', 'pointer-only'], ['m', 'hero-h', 'touch-only'], ['d', 'ms-h', 'pointer-only'], ['m', 'ms-h', 'touch-only'],
  ['sm', 'btn', 'is-small'], ['lt', 'btn', 'is-light'], ['ol', 'btn', 'is-outline'], ['sm', 'pn-f', 'is-small'],
  ['up', 'tr-b', 'is-up'], ['dn', 'tr-b', 'is-down'], ['k', 'tr-t', 'home-trail_kicker'],
  ['a', 'nt-tx', 'is-first'], ['b', 'nt-tx', 'is-second'],
  ['a', 'nt-r', 'is-far'], ['b', 'nt-r', 'is-near'], ['c', 'nt-r', 'is-chapel'],
  ['dt', 'yr', 'home-year_date'], ['tt', 'yr', 'home-year_title-wrap'], ['ds', 'yr', 'home-year_description'],
  ['ar', 'yr', 'home-year_arrow'],
  ['q', 'rs-c', 'home-rostos_quote'], ['n', 'rs-b', 'is-next'], ['now', 'tag', 'is-now'],
  ['st', 'dw-h', 'drawer_step-count'], ['sub', 'stp', 'drawer_step-intro'],
  ['full', 'fl', 'is-full'], ['full', 'fm', 'is-full'], ['dob', 'fl', 'is-date'],
];

const ADD = [
  ['.nav-l a', 'nav_link'], ['.burger span', 'nav_burger-line'],
  ['.menu ul', 'menu_list'], ['.menu li a', 'menu_link'], ['.menu li button', 'menu_link'],
  ['.ft-top .act p', 'footer_cta-text'], ['.ft-cols>div', 'footer_column'], ['.ft-cols h3', 'footer_heading'],
  ['.ft-cols ul', 'footer_list'], ['.ft-cols li', 'footer_item'],
  ['.od-c i', 'loader_digit-strip'], ['.btn i', 'button_dot'],
  ['.hero-tag i', 'home-hero_tag-line'], ['.hero h1', 'home-hero_title'], ['.hero-h i', 'home-hero_hint-dot'],
  ['.pn-f img', 'picture_image'], ['.pn-f figcaption', 'picture_caption'],
  ['.mani-f p', 'home-manifesto_note'],
  ['.tr-v i', 'home-trail_line-fill'], ['.tr-v b', 'home-trail_line-lamp'], ['.tr-t h3', 'home-trail_heading'],
  ['.tr-t p', 'home-trail_paragraph'], ['.nt-tx p', 'home-night_paragraph'],
  ['.yr-i a', 'home-year_link'], ['.yr .tt b', 'home-year_title'],
  ['.rs-c img', 'home-rostos_image'], ['.rs-m b', 'home-rostos_name'], ['.rs-m span', 'home-rostos_role'],
  ['.ms-star i', 'home-memory_star-dot'], ['.ms-l b', 'home-memory_name'], ['.ms-l span', 'home-memory_role'],
  ['.ms-l a', 'home-memory_link'],
  ['.jn-ul li', 'join_item'], ['.jn-f label', 'join_label'], ['.jn-row input', 'join_input'],
  ['.jn-p b', 'join_price'], ['.jn-p span', 'join_price-label'],
  ['.head>.in p', 'section-header_text'],
  ['.card-f .top svg', 'member-card_logo'], ['.card-f .top span', 'member-card_type'],
  ['.card-f .num small', 'member-card_number-label'], ['.card-f .nm b', 'member-card_name'],
  ['.card-f .nm span', 'member-card_place'], ['.card-b svg', 'member-card_back-mark'],
  ['.card-b p', 'member-card_back-text'],
  ['.ph>img', 'image-cover'],
];

const RAW = [
  // the tag changes below need the hover forms rewritten too
  ['.btn:hover i', '.btn:hover .button_dot'],
  ['.rs-c:hover img', '.rs-c:hover .home-rostos_image'],
  ['.rs-c:hover .q', '.rs-c:hover .home-rostos_quote'],
  ['.yr-i a:hover .ar', '.home-year_link:hover .home-year_arrow'],
  ['.yr:hover .yr-i a', '.yr:hover .home-year_link'],
  ['.yr .yr-i a:hover', '.yr .home-year_link:hover'],
  // these two would otherwise tie with a class of the element they reach
  ['.ft>*', ':where(.ft)>*'], ['.ln>*', ':where(.ln)>*'],
];

// elements whose tag changes so Webflow keeps them as plain elements
const TAGS = {
  'button_dot': 'span', 'nav_burger-line': 'span', 'loader_digit-strip': 'span', 'home-hero_tag-line': 'span',
  'home-hero_hint-dot': 'span', 'home-trail_line-fill': 'span', 'home-trail_line-lamp': 'span',
  'home-trail_dot': 'span', 'home-year_title': 'span', 'home-rostos_name': 'span', 'home-memory_star-dot': 'span',
  'home-memory_name': 'span', 'join_price': 'span', 'member-card_number-label': 'span', 'member-card_name': 'span',
};

// leaf classes safe to address on their own although they carry no component prefix
const UNIQUE = new Set(['pointer-only', 'touch-only']);
// ancestors that change how a child looks: never dropped from a selector
const THEME = /^background-color-/;

const HREF = {
  './': '/', 'index.html': '/', 'sobre.html': '/sobre', 'rostos.html': '/rostos', 'caminhada.html': '/caminhada',
  'agenda.html': '/agenda', 'contactos.html': '/contactos', 'graca.html': '/em-memoria',
  'documentos.html': '/documentos', 'privacidade.html': '/privacidade', 'cookies.html': '/cookies',
};

/* the design's short tokens read Webflow's variables, so a change in the Variables panel reaches everything */
const ALIAS = {
  '--v': '--_base---green--500', '--v-d': '--_base---green--700', '--v-dd': '--_base---green--900',
  '--v-n': '--_base---green--950', '--v-s': '--_base---green--300', '--v-l': '--_base---green--200',
  '--p': '--_base---paper--100', '--p-2': '--_base---paper--200', '--w': '--_base---paper--white',
  '--t': '--_theme---text--primary', '--t-2': '--_theme---text--secondary', '--t-3': '--_theme---text--muted',
  '--ln': '--_theme---border--default', '--ln-c': '--_theme---border--invert',
  '--lamp': '--_base---light--lantern', '--err': '--_base---signal--error',
  '--exo': '--_typography---font--heading', '--sans': '--_typography---font--body',
  '--pad': '--_layout---gutter', '--gap': '--_layout---grid-gap', '--sec': '--_layout---section-padding',
  '--nav': '--_layout---nav-height',
  '--s1': '--_sizes---space--1', '--s2': '--_sizes---space--2', '--s3': '--_sizes---space--3',
  '--s4': '--_sizes---space--4', '--s5': '--_sizes---space--5', '--s6': '--_sizes---space--6',
};

module.exports = { ALIAS, G, CTX, ADD, RAW, TAGS, UNIQUE, THEME, HREF };
