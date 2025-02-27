let userData = null;

const setUserData = (data) => {
  userData = data; // Salva os dados do usuário em um estado global (no caso, uma variável)
};

const getUserData = () => {
  return userData; // Retorna os dados do usuário
};

const clearUserData = () => {
  userData = null; // Limpa os dados armazenados
};

export default {
  setUserData,
  getUserData,
  clearUserData,
};
