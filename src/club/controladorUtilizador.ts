// Controlador do clube do utilizador (Prompt 5, Bloco A): o utilizador é o Presidente. As decisões chegam da interface
// por comandos; o que ainda não tem ecrã segue o conselho por omissão — o mesmo que a IA faria.
import { ControladorIA } from './controlador.ts';

export class ControladorUtilizador extends ControladorIA {
  // @ts-expect-error — o tipo literal do controlador da IA é 'ia'; este é o do utilizador.
  readonly tipo = 'utilizador' as const;
  /** A4: as obras são lançadas pelo utilizador (Infraestruturas). */
  obra(): null { return null; }
}
