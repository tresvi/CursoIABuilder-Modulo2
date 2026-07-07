interface FileLoaderProps {
  onFile: (file: File) => void;
}

/** Selector de archivo CSV. Delega el parseo al componente padre. */
export function FileLoader({ onFile }: FileLoaderProps) {
  return (
    <div className="file-loader">
      <label htmlFor="ecg-file">Archivo CSV:</label>
      <input
        id="ecg-file"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Permite volver a cargar el mismo archivo tras una corrección.
          e.target.value = '';
        }}
      />
    </div>
  );
}
