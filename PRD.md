# PRD-001: ECGViewer — Visor de Electrocardiogramas (ECGs)

## Contexto y Problema

En el día a día técnico electrocardiografo, médico, estudiante se ve obligado a manipular señales de dificultosa lectura (ruidosas), que requieren procedimientos manuales para detectar métricas clave y sin posibilidad de indexarlas de forma sencilla para un posterior analisis automático.
Por otro lado, no existen herramientas gratuitas, accesibles y totalmente integradas orientadas a este tipo visualización y análisis de señales biomedicas.

### Personas
- Tecnico electrocardiografo: Prepara al paciente y realiza la toma del ECG. Se ve obligado a operar el equipo normalmente en un equipo del cual desconoce su estado de calibracion, y con filtros de ruido básicos (muchas veces analógicos, que degradan la señal) o inexistentes debiendo aceptar la señal capturada sin poder mejorarla.
- Medico: Es el que recibe la señal capturada por el técnico "como salió", sin posibilidad de aplicarle filtros para mejorar su lectura, dificultando el diagnostico. Es el encargado de analizar y realizar un diagnóstico sobre lo observado normalmente en un papel térmico, con los problemas que ello conlleva.
- Docente/Estudiante de ingenieria biomédica/electronica: Visualiza señales de ECG: Visualiza señales ECG, las guarda, las compara y saca conclusiones en base a la comparación. A si mismo, realiza anotaciones para marcar artefactos (ruido eléctrico) arritmias (alteraciones de ritmo) y anomalias (alteraciones morfológicas)

## Objetivos

Desarrollar **ECG Viewer** una aplicación web para **visualizar, filtrar y analizar señales de electrocardiograma (ECG)** a partir de archivos CSV sencillos. Está orientada a entornos **educativos y de investigación**.
El usuario puede **cargar señales desde archivos**, **visualizarlas en un gráfico principal**, **aplicar filtros digitales**, **consultar métricas cardíacas**, **anotarlas** sobre el grafico, **realizar mediciones asistidas** e **importar/exportar datos en Excel**.

## Requerimientos Funcionales
- RF-01: Permitir cargar y visualizar señales ECG de un canal desde archivos CSV (con primer linea de header), con el valor de la señal en el eje Y y el tiempo en el eje X.
- RF-02: Permitir marcar eventos en cualquier parte del eje temporal del gráfico.
- RF-03: Proveer herramientas de basicas de manejo de gráficos: zoom, rejilla ECG, regla, marcadores y recorte.
- RF-04: Ofrecer filtrado digital (pasa bajo, pasa alto, pasa banda, notch) directamente desde la pantalla principal.
- RF-05: Importar y exportar datos en formato Excel (.xlsx).
- RF-06: Entregar una interfaz web moderna, usable y accesible desde el navegador.
- RF-07: Mostrar métricas cardíacas (BPM, SDNN, RMSSD, pNN50) calculadas sobre la ventana de tiempo visible en el gráfico.

## Requerimientos No Funcionales
- RNF-01: La biblioteca gráfica utilizada debe renderizar el grafico del ECG en menos de 0.1 segundo, tomando de referencia un gráfico de 1 minuto.
- RNF-02: La biblioteca gráfica no deberá producir parpadeos en la pantalla al actualizar
- RNF-03: Los calculos de las métricas no deberán realizarse en tiempo menor a 0.1 segundo, tomando como referencia un gráfico de 1 minuto.
- RNF-04: El aplicativo deberá correr en cualquier navegador, incluido los móviles.
- RNF-05: Toda contraseña o dato que se considere privado, debe almacenarse con hash seguro (bcrypt/argon2), nunca en texto plano; la sesión expira tras 24hs de inactividad.
- RNF-06: Todo gráfico o información modificada, nunca se guardan automaticamente. Siempre será el usuario quien activamente solicite guardar cambios.
- RNF-07: Si el usuario se retira habiendo hecho cambios al grafico y no habiendo guardado estos, el sistema le alerta.

## Criterios de Aceptación
- AC-01 (RF-01): Dado un archivo CSV válido de un canal con columnas tiempo/valor, cuando se carga, entonces el gráfico se dibuja con el tiempo en el eje X (en segundos) y la señal en el eje Y medida en mV (mili volts), respetando el orden temporal del archivo.
- AC-02 (RF-01): Dado un archivo CSV con formato inválido (columnas faltantes, valores no numéricos o encabezado incorrecto), cuando se intenta cargar, entonces el sistema muestra un mensaje de error específico y no dibuja ningún gráfico.
- AC-03 (RF-01): Dado un archivo CSV con más de un canal, cuando se intenta cargar, entonces el sistema informa que solo soporta un canal y no procesa el archivo (o, si aplica, solicita al usuario seleccionar cuál canal usar).
- AC-04 (RF-02): Dado un gráfico ECG ya cargado, cuando el usuario hace clic sobre cualquier punto del eje temporal, entonces se crea un marcador de evento anclado a ese instante de tiempo, visible y persistente mientras dure la sesión de trabajo.
- AC-05 (RF-02): Dado un evento ya marcado, cuando el usuario lo selecciona, entonces puede eliminarlo o editarlo (p. ej. etiqueta/comentario asociado).
- AC-06 (RF-03): Dado un gráfico cargado, cuando el usuario aplica zoom sobre una seccion, entonces existe una opción para restablecer el zoom original.
- AC-07 (RF-03): Dado un gráfico cargado, cuando el usuario usa la herramienta regla entre dos puntos del trazo, entonces se muestra la diferencia de tiempo (y de amplitud si corresponde) entre ambos puntos.
- AC-08 (RF-03): Dado un gráfico cargado, cuando el usuario aplica la herramienta de recorte sobre un rango temporal, entonces el sistema genera una nueva señal acotada a ese rango, sin alterar los datos fuera de la selección hasta que se confirme el recorte.
- AC-09 (RF-04): Dado un gráfico cargado, cuando el usuario aplica un filtro (pasa bajo, pasa alto, pasa banda o notch) con sus parámetros (frecuencia de corte superior/inferior), entonces el gráfico se actualiza mostrando la señal filtrada sin necesidad de salir de la pantalla principal.
- AC-10 (RF-04): Dado un filtro ya aplicado, el usuario tiene la posbiilidad de no aceptar los cambios y revertir la señal a la original.
- AC-11 (RF-05): Dado un dataset cargado en la aplicación, cuando el usuario exporta a .xlsx, entonces se genera un archivo válido que al reabrirse en Excel (o reimportarse en la app) conserva los valores de tiempo y señal originales.
- AC-12 (RF-05): Dado un archivo .xlsx con la estructura esperada, cuando el usuario lo importa, entonces el sistema carga los datos y los grafica igual que con un CSV válido (AC-01); si la estructura no es la esperada, se rechaza con mensaje de error.
- AC-13 (RF-07): Dado un gráfico con una ventana de tiempo visible (por zoom o carga completa), cuando se calculan las métricas, entonces BPM, SDNN, RMSSD y pNN50 se muestran calculados únicamente sobre los datos visibles en esa ventana, no sobre todo el archivo.
- AC-14 (RF-07): Dado que el usuario cambia el rango visible (zoom in/out o desplazamiento), cuando el gráfico se actualiza, entonces las métricas se recalculan y reflejan el nuevo rango.
- AC-15 (RNF-01): Dado un archivo de referencia de 1 minuto de duración, cuando se carga y renderiza, entonces el tiempo de renderizado medido es menor a 0.1 s.
- AC-16 (RNF-02): Dado un gráfico en pantalla, cuando se actualiza (zoom, filtro, nuevo dato), entonces no se observan parpadeos ni redibujados completos visibles (validado por inspección visual o métrica de repintado del navegador).
- AC-17 (RNF-03): Dado un archivo de referencia de 1 minuto de duración, cuando se calculan BPM, SDNN, RMSSD y pNN50, entonces el tiempo total de cálculo medido es menor a 0.1 s.
- AC-18 (RNF-04): Dada la aplicación abierta en al menos un navegador de escritorio (Chrome/Firefox/Edge) y uno móvil (Chrome Android/Safari iOS), cuando se realizan las operaciones básica (carga, zoom, filtro, marcado de eventos), entonces todas funcionan correctamente sin errores de compatibilidad.
- AC-19 (RNF-05): Dado un usuario que se autentica correctamente, cuando se inspecciona el almacenamiento de contraseñas, entonces estas están guardadas con hash bcrypt/argon2 y nunca en texto plano.
- AC-20 (RNF-06): Dado un gráfico con marcadores, filtros o recortes aplicados, cuando el usuario cierra o recarga la pantalla sin haber presionado "Guardar", entonces los cambios no se persisten y se pierden (comportamiento esperado, no un bug). Aunque se le debe alertar al usuario lo que esta por suceder y pedir confirmación.
- AC-21 (RNF-06): Dado un gráfico con cambios pendientes, cuando el usuario presiona explícitamente "Guardar", entonces recién en ese momento los cambios quedan persistidos.

## Fuera de Alcance
- Captura, lectura o registro en tiempo real desde dispositivos hardware (puerto serie u otros).
- Espacios de trabajo de filtrado separados del gráfico principal.
- Exportación a formatos de simulación o firmware (Proteus, tablas C, EDF, WFDB, etc.).
- Diagnóstico clínico certificado; la herramienta no sustituye equipamiento médico homologado.
- Autenticación multi-usuario, roles o almacenamiento en la nube (fuera de v1).
- Integración con estándares hospitalarios (HL7, DICOM, HL7-aECG)
- Sparklines decorativas u otros gráficos de estadísticas de señal (energía por banda, histogramas de amplitud, etc.) en el panel de métricas. 
- Soporte Multi-Tenant

## Riesgos y Dependencias
- Riesgo: la librería gráfica no cumple los umbrales de rendimiento (render <0.1 s,
  sin parpadeos) → mitigación: elegir una librería basada en Canvas/WebGL y medir
  contra el archivo de referencia de 1 minuto (RNF-01, RNF-02, AC-15, AC-16).
- Riesgo: detección poco fiable de picos R sobre señal ruidosa que arroje métricas
  erróneas (BPM, SDNN, RMSSD, pNN50) → mitigación: aplicar el filtrado digital
  antes del cálculo y validar contra señales conocidas (RF-04, RF-07, AC-13).
- Dependencia: librería gráfica de alto rendimiento (Canvas/WebGL) · algoritmos de
  filtrado digital (DSP) y detección de picos R.

## Glosario

- ECG: Electrocardiograma; registro de la actividad eléctrica del corazón.
- BPM: Frecuencia cardíaca en latidos por minuto.
- HRV: Variabilidad de la frecuencia cardíaca; en este producto se cuantifica mediante SDNN, RMSSD y pNN50.
- SDNN: Desviación estándar de los intervalos NN (ms).
- RMSSD: Raíz cuadrada de la media de las diferencias sucesivas al cuadrado entre RR (ms).
- pNN50: Porcentaje de pares RR consecutivos cuya diferencia supera 50 ms.
- Ventana visible: Rango temporal `[fromTime, toTime]` mostrado actualmente en el gráfico ECG tras pan/zoom.
