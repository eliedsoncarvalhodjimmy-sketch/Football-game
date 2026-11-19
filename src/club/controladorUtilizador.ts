// Controlador do clube do utilizador (Prompt 5, Bloco A): o utilizador é o Presidente. As decisões chegam da interface
// por comandos (blocos seguintes); enquanto não houver decisão, aplica-se o conselho por omissão — o mesmo que a IA faria.
import { ControladorIA } from './controlador.ts';

export class ControladorUtilizador extends ControladorIA {
  // @ts-expect-error — o tipo literal do controlador da IA é 'ia'; este é o do utilizador.
  readonly tipo = 'utilizador' as const;
}
