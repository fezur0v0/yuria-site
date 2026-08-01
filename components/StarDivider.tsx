import HorizontalRule from '@tiptap/extension-horizontal-rule';

const STAR_PATH =
  'M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.446l-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z';

function starChain(tailClass: string) {
  return [
    'div',
    { class: `sd-x ${tailClass}` },
    [
      'div',
      { class: 'sd-y' },
      [
        'div',
        { class: 'sd-z' },
        ['svg', { class: 'sd-star', viewBox: '0 0 24 24' }, ['path', { d: STAR_PATH }]],
      ],
    ],
  ];
}

const StarDivider = HorizontalRule.extend({
  renderHTML() {
    return [
      'div',
      { class: 'star-divider', 'data-type': 'star-divider' },
      ['div', { class: 'star-divider-stage' }, starChain('sd-tail2'), starChain('sd-tail1'), starChain('sd-lead')],
    ];
  },
});

export default StarDivider;
