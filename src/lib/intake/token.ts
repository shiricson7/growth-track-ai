export const isTokenExpired = (expiresAt: string) => {
  const exp = new Date(expiresAt).getTime();
  return Number.isFinite(exp) && exp < Date.now();
};
