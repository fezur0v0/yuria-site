import HorizontalRule from '@tiptap/extension-horizontal-rule';

const StarDivider = HorizontalRule.extend({
  parseHTML() {
    return [{ tag: 'div[data-type="star-divider"]' }];
  },
  renderHTML() {
    const unit = '☆ ★ --- ★ ';
    return [
      'div',
      { class: 'star-divider', 'data-type': 'star-divider' },
      ['span', { class: 'star-divider-line' }, unit.repeat(40)],
    ];
  },
});

export default StarDivider;
