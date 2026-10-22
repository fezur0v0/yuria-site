import type { ImgHTMLAttributes } from 'react';
import { privateTheaterMediaUrl } from '@/utils/notes/media';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string };

export default function PrivateTheaterImage({ src, alt = '', ...props }: Props) {
  return <img {...props} alt={alt} src={src ? privateTheaterMediaUrl(src) : undefined} />;
}
