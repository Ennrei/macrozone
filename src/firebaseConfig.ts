import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCF7Vj6wBs9cX1f_Bvg50INYl733HYLSuk",
  authDomain: "fir-server-557ad.firebaseapp.com",
  projectId: "fir-server-557ad",
  storageBucket: "fir-server-557ad.firebasestorage.app",
  messagingSenderId: "992531327198",
  appId: "1:992531327198:web:ea64d5719c18546af67a4f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);