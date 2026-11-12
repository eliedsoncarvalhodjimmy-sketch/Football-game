// Interface de acesso aos pacotes. O primeiro adaptador lê ficheiros locais;
// adaptadores de APIs ficam para depois.

export interface DataSource {
  /** Ids das pastas de pacotes disponíveis (inclui "_continental"). */
  listarPacotes(): Promise<string[]>;
  /** Lê um ficheiro de texto de um pacote; null se não existir. */
  lerTexto(pacote: string, caminho: string): Promise<string | null>;
  /** Lista ficheiros de uma subpasta de um pacote. */
  listarFicheiros(pacote: string, subpasta: string): Promise<string[]>;
}
