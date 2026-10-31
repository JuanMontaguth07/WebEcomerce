# Catálogo de referencia de Arma tu PC

359 piezas que la tienda no vende pero que aparecen en «Arma tu PC» para armar y comparar (marcadas «Solo referencia»: nunca se ven en la tienda ni se pueden pedir). Van sin precio: en el configurador muestran «En tiendas» y los botones de búsqueda. Cuando cargues una oferta (Amazon, MercadoLibre…) en la pieza, pasa a mostrar «Desde $…».

| Archivo                  | Categoría         | Piezas | Cómo                                                                         |
| ------------------------ | ----------------- | ------ | ---------------------------------------------------------------------------- |
| 01-procesadores.csv      | Procesadores      | 93     | Modelos exactos: Ryzen 5000/7000/8000/9000, Intel 12.ª–14.ª y Core Ultra 200 |
| 02-placas-madre.csv      | Placas Madre      | 77     | Modelos populares de AM4, AM5, LGA1700 y LGA1851                             |
| 03-tarjetas-de-video.csv | Tarjetas De Video | 61     | Por chip: RTX 20–50, RX 500–9000, Intel Arc                                  |
| 04-memoria-ram.csv       | Memoria Ram       | 24     | Genéricas por tipo, capacidad y velocidad                                    |
| 05-almacenamiento.csv    | Almacenamiento    | 22     | Genéricos por tipo y capacidad                                               |
| 06-fuentes-de-poder.csv  | Fuentes de poder  | 22     | Genéricas por potencia y certificación                                       |
| 07-refrigeracion.csv     | Refrigeraciones   | 31     | Modelos populares de aire y líquida                                          |
| 08-chasis.csv            | Chasis            | 29     | Modelos populares con sus medidas                                            |

## Cómo cargarlo

1. **Categorías.** Crea la categoría «Fuentes de poder» (las demás ya existen con esos nombres). En cada una de las 8, sección «Kova Architect»: elige la pieza que representa y pulsa «Aplicar plantilla». Así quedan las columnas de ficha que traen los archivos.
2. **Importar.** En Productos → Importar, sube los archivos uno por uno (en cualquier orden). La vista previa debe salir sin errores; las marcas que no existan (Noctua, NZXT, Lian Li…) se crean solas.
3. **Revisar.** Abre Arma tu PC: ya aparecen todas. El selector «Piezas demo» desaparece cuando haya piezas **con precio** de los 8 tipos (en la tienda o con ofertas), que es lo que necesita el modo guiado para repartir un presupuesto.

Para agregar piezas después, edita el archivo (o uno nuevo con las mismas columnas) y vuelve a importarlo: el SKU identifica cada pieza, así que lo que ya existe se actualiza y no se duplica.

## Enlaces de compra y «Disponible aquí»

- **Búsquedas**: cada pieza trae sola los botones «Buscar en Amazon, MercadoLibre y Google Shopping» con su nombre. No hacen falta cargar.
- **Ofertas con precio**: en el producto (sección de ofertas) pegas el enlace exacto de Amazon, MercadoLibre, etc., con su precio. Los archivos no traen enlaces directos porque no se pueden verificar sin entrar a cada tienda.
- **Disponible aquí**: cuando vendas una versión de una pieza (p. ej. una ASUS RTX 5060 Ti de la «NVIDIA GeForce RTX 5060 Ti 16 GB»), en el producto de la tienda elige «Versión de (pieza de referencia)», o en la importación usa la columna «Versión de» con el SKU de la pieza (`REF-GPU-…`). La pieza de referencia pasa a mostrar «Disponible aquí» con tu precio y stock, y «Agregar todo al carrito» agrega tu versión.

## Qué revisar

- **Puntaje de rendimiento** (procesadores y gráficas): es aproximado, de 1 a 100. En gráficas, 100 = RTX 5090 y la escala es lineal (RTX 4090 ≈ 76, RTX 4060 ≈ 20). En procesadores mezcla multinúcleo y juegos, con 100 = Ryzen 9 9950X3D.
- **Gráficas por chip**: el largo es el típico de los modelos de ensambladores; cada versión (ASUS, MSI, Gigabyte…) puede medir distinto. Si cargas un modelo exacto, pon su largo real.
- **Placas madre**: en algunas la columna «Ranuras M.2» va vacía porque no está confirmada; el configurador lo muestra «por confirmar» en vez de suponer. Complétala con la página del fabricante.
- **Refrigeración**: la capacidad térmica es aproximada (casi ningún fabricante la publica).
- **Fuentes «ATX 3.1»**: traen el conector 12V-2x6 nativo para gráficas nuevas.
- Lo que salga al mercado después de estos archivos se agrega con el mismo formato.
