import { Node } from '@tiptap/core';

const IMAGE_BASE = 'https://images.animesparks.blog';

export const PortableTextImage = Node.create({
  name: 'ptImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      r2Key: { default: null },
      publicUrl: { default: null },
      sanityId: { default: null },
      alt: { default: '' },
      caption: { default: '' },
      _key: { default: null },
      extraFields: { default: null },
    };
  },

  parseHTML() {
    return [{
      tag: 'figure[data-portable-text-image]',
      getAttrs: element => {
        const figure = element as HTMLElement;
        const image = figure.querySelector('img');
        const caption = figure.querySelector('figcaption');
        return {
          r2Key: image?.dataset.r2Key || null,
          publicUrl: image?.src || null,
          alt: image?.alt || '',
          caption: caption?.textContent || '',
        };
      },
    }];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as Record<string, string | null>;
    const key = attrs.r2Key || '';
    const src = attrs.publicUrl || (key
      ? `${IMAGE_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`
      : '');
    const imageAttrs = { src, alt: attrs.alt || '', 'data-r2-key': key };
    const figureAttrs = { 'data-portable-text-image': 'true', class: 'admin-portable-image' };

    return attrs.caption
      ? ['figure', figureAttrs, ['img', imageAttrs], ['figcaption', {}, attrs.caption]]
      : ['figure', figureAttrs, ['img', imageAttrs]];
  },
});
