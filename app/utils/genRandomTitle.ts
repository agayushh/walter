export const genRandomTitle = async () => {
  return "New Chat " + Math.random().toString(36).substring(7);
};