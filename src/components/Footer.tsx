export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-stroke px-4 pb-14 pt-10 text-app-muted">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">&copy; {year} jellybrainz</p>
      </div>
    </footer>
  );
}
