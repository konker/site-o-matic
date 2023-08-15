export function maxLenLabel(s: string, maxlen = -1): string {
  const PAD = '...';
  const pl = PAD.length;

  if (maxlen === -1) return s;
  if (s.length <= maxlen) return s;
  if (maxlen < pl + 2) return s.slice(0, maxlen);

  const dl = s.length - maxlen + pl;
  const ll = Math.floor((s.length - dl) / 2);

  return s.slice(0, ll) + PAD + s.slice(ll + dl);
}

export function ssmParamLabel(paramName: string, maxlen = -1): string {
  const levels = paramName.split('/');
  if (levels.length < 2) return maxLenLabel(paramName, maxlen);
  return levels.map((i) => maxLenLabel(i, maxlen)).join('\n ↪ ');
}
