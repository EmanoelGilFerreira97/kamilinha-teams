import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type Cores, type EsquemaDeCores } from '@/constants/theme';

/** `sistema` segue o aparelho; as outras duas mandam nele. */
export type PreferenciaDeTema = 'sistema' | 'claro' | 'escuro';

const CHAVE = 'kamilinha:tema';

type EstadoDoTema = {
  cores: Cores;
  esquema: EsquemaDeCores;
  preferencia: PreferenciaDeTema;
  definirPreferencia: (nova: PreferenciaDeTema) => void;
};

const TemaContext = createContext<EstadoDoTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const doAparelho = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaDeTema>('sistema');

  useEffect(() => {
    // A escolha sobrevive ao fechar o app; ate ela voltar do disco vale o
    // padrao, que e seguir o aparelho.
    AsyncStorage.getItem(CHAVE).then((salva) => {
      if (salva === 'claro' || salva === 'escuro' || salva === 'sistema') {
        setPreferencia(salva);
      }
    });
  }, []);

  const valor = useMemo<EstadoDoTema>(() => {
    const esquema: EsquemaDeCores =
      preferencia === 'sistema' ? (doAparelho === 'dark' ? 'dark' : 'light') : preferencia === 'escuro' ? 'dark' : 'light';

    return {
      cores: Colors[esquema],
      esquema,
      preferencia,
      definirPreferencia: (nova) => {
        setPreferencia(nova);
        void AsyncStorage.setItem(CHAVE, nova);
      },
    };
  }, [preferencia, doAparelho]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): EstadoDoTema {
  const contexto = useContext(TemaContext);
  if (contexto === null) throw new Error('useTema precisa estar dentro de TemaProvider.');
  return contexto;
}
