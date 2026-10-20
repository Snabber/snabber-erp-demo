// Mensagens de sucesso/erro passadas por ?ok= e ?erro= pelas ações do servidor.
export default function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  return (
    <>
      {ok && <div className="flash ok">{ok}</div>}
      {erro && <div className="flash err">{erro}</div>}
    </>
  );
}
