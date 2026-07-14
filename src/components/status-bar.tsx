/** Compact stacked bar for list rows — a donut per row would be too tall. */
export function StatusBar({
  todo,
  inProgress,
  done,
}: {
  todo: number;
  inProgress: number;
  done: number;
}) {
  const total = todo + inProgress + done;
  if (total === 0) {
    return <div className="mt-2 h-2 w-full rounded-full bg-slate-100" />;
  }
  return (
    <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
      {done > 0 && (
        <div
          className="bg-emerald-500"
          style={{ width: `${(done / total) * 100}%` }}
        />
      )}
      {inProgress > 0 && (
        <div
          className="bg-amber-400"
          style={{ width: `${(inProgress / total) * 100}%` }}
        />
      )}
      {todo > 0 && (
        <div
          className="bg-slate-300"
          style={{ width: `${(todo / total) * 100}%` }}
        />
      )}
    </div>
  );
}
