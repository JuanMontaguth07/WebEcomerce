-- =============================================================================
-- DATOS DE DEMOSTRACIÓN — NO USAR EN PRODUCCIÓN
-- Marcas, modelos, precios e inventario son ficticios. Todos los SKU empiezan
-- por "DEMO-" y la interfaz los marca como "Producto de demostración".
-- Solo se carga si la base no tiene productos.
-- =============================================================================

do $$
begin
  if exists (select 1 from public.products) then
    raise notice 'La base ya tiene productos: no se cargan datos de demostración.';
    return;
  end if;

  -- Categorías -----------------------------------------------------------------
  insert into public.categories (name, slug, position, description, seo_title, seo_description) values
    ('Tarjetas gráficas', 'tarjetas-graficas', 1,
     'Tarjetas gráficas para gaming, diseño y edición de video. Compara memoria de video, consumo y longitud antes de elegir.',
     'Tarjetas gráficas en Colombia', 'Compra tarjetas gráficas para gaming y creación de contenido. Compara memoria, consumo y compatibilidad.'),
    ('Procesadores', 'procesadores', 2,
     'Procesadores para equipos de escritorio. Revisa socket, núcleos y consumo para armar un equipo compatible.',
     'Procesadores gamer y para trabajo', 'Procesadores de escritorio con socket, núcleos, frecuencias y consumo detallados.'),
    ('Memorias RAM', 'memorias-ram', 3,
     'Memorias RAM DDR4 y DDR5 para escritorio. Elige capacidad, velocidad y latencia según tu placa madre.',
     'Memorias RAM DDR4 y DDR5', 'Memorias RAM para PC de escritorio: capacidad, velocidad y latencia.'),
    ('Almacenamiento', 'almacenamiento', 4,
     'Unidades SSD NVMe y SATA. Compara capacidad y velocidades de lectura y escritura.',
     'SSD NVMe y SATA', 'Unidades de estado sólido NVMe y SATA para PC.'),
    ('Placas madre', 'placas-madre', 5,
     'Placas madre AM5 y LGA para armar tu equipo. Revisa socket, chipset, formato y ranuras M.2.',
     'Placas madre para PC', 'Placas madre con socket, chipset, formato y memoria compatible.'),
    ('Fuentes de poder', 'fuentes-de-poder', 6,
     'Fuentes de poder certificadas para alimentar tu equipo con margen y eficiencia.',
     'Fuentes de poder certificadas', 'Fuentes de poder con potencia, certificación y tipo de cableado.'),
    ('Gabinetes', 'gabinetes', 7,
     'Gabinetes ATX y Micro-ATX con buen flujo de aire y espacio para tarjetas largas.',
     'Gabinetes para PC', 'Gabinetes ATX y Micro-ATX: formato, ventiladores y espacio para la GPU.'),
    ('Refrigeración', 'refrigeracion', 8,
     'Disipadores por aire y refrigeración líquida AIO para mantener tu procesador estable.',
     'Refrigeración para procesadores', 'Disipadores de aire y refrigeración líquida compatibles con AM5 y LGA.'),
    ('Computadores', 'computadores', 9,
     'Computadores de escritorio armados y probados, listos para jugar, crear y trabajar.',
     'Computadores gamer armados', 'Computadores de escritorio armados para gaming, diseño y trabajo.'),
    ('Monitores', 'monitores', 10,
     'Monitores para gaming y productividad. Compara tamaño, resolución y frecuencia de actualización.',
     'Monitores gamer', 'Monitores con tamaño, resolución, tipo de panel y frecuencia detallados.');

  -- Marcas (ficticias) -----------------------------------------------------------
  insert into public.brands (name, slug) values
    ('Voltaris', 'voltaris'),
    ('Arcanum', 'arcanum'),
    ('Northbyte', 'northbyte'),
    ('Kairos', 'kairos'),
    ('Helion', 'helion'),
    ('Strata', 'strata'),
    ('Frostline', 'frostline'),
    ('Lumen', 'lumen');

  -- Especificaciones por categoría ----------------------------------------------
  insert into public.spec_definitions (category_id, key, label, group_label, unit, data_type, is_filterable, position)
  select c.id, s.key, s.label, s.grp, s.unit, s.dtype::public.spec_data_type, s.filterable, s.pos
  from (values
    ('tarjetas-graficas', 'vram', 'Memoria de video', 'Memoria', 'GB', 'number', true, 1),
    ('tarjetas-graficas', 'memory_type', 'Tipo de memoria', 'Memoria', null, 'text', false, 2),
    ('tarjetas-graficas', 'interface', 'Interfaz', 'Conectividad', null, 'text', false, 3),
    ('tarjetas-graficas', 'outputs', 'Salidas de video', 'Conectividad', null, 'text', false, 4),
    ('tarjetas-graficas', 'tdp', 'Consumo típico', 'Energía', 'W', 'number', false, 5),
    ('tarjetas-graficas', 'recommended_psu', 'Fuente recomendada', 'Energía', 'W', 'number', false, 6),
    ('tarjetas-graficas', 'length', 'Longitud', 'Dimensiones', 'mm', 'number', false, 7),
    ('procesadores', 'socket', 'Socket', 'Compatibilidad', null, 'text', true, 1),
    ('procesadores', 'cores', 'Núcleos', 'Rendimiento', null, 'number', true, 2),
    ('procesadores', 'threads', 'Hilos', 'Rendimiento', null, 'number', false, 3),
    ('procesadores', 'boost_clock', 'Frecuencia máxima', 'Rendimiento', 'GHz', 'number', false, 4),
    ('procesadores', 'tdp', 'TDP', 'Energía', 'W', 'number', false, 5),
    ('procesadores', 'integrated_graphics', 'Gráficos integrados', 'Rendimiento', null, 'boolean', false, 6),
    ('memorias-ram', 'capacity', 'Capacidad total', 'Memoria', 'GB', 'number', true, 1),
    ('memorias-ram', 'memory_type', 'Tipo', 'Memoria', null, 'text', true, 2),
    ('memorias-ram', 'modules', 'Módulos', 'Memoria', null, 'text', false, 3),
    ('memorias-ram', 'speed', 'Velocidad', 'Rendimiento', 'MHz', 'number', false, 4),
    ('memorias-ram', 'latency', 'Latencia', 'Rendimiento', null, 'text', false, 5),
    ('almacenamiento', 'capacity', 'Capacidad', 'Almacenamiento', 'GB', 'number', true, 1),
    ('almacenamiento', 'interface', 'Interfaz', 'Conectividad', null, 'text', true, 2),
    ('almacenamiento', 'form_factor', 'Formato', 'Conectividad', null, 'text', false, 3),
    ('almacenamiento', 'read_speed', 'Lectura secuencial', 'Rendimiento', 'MB/s', 'number', false, 4),
    ('almacenamiento', 'write_speed', 'Escritura secuencial', 'Rendimiento', 'MB/s', 'number', false, 5),
    ('placas-madre', 'socket', 'Socket', 'Compatibilidad', null, 'text', true, 1),
    ('placas-madre', 'chipset', 'Chipset', 'Compatibilidad', null, 'text', false, 2),
    ('placas-madre', 'form_factor', 'Formato', 'Compatibilidad', null, 'text', true, 3),
    ('placas-madre', 'memory_type', 'Memoria compatible', 'Memoria', null, 'text', false, 4),
    ('placas-madre', 'memory_slots', 'Ranuras de memoria', 'Memoria', null, 'number', false, 5),
    ('placas-madre', 'm2_slots', 'Ranuras M.2', 'Almacenamiento', null, 'number', false, 6),
    ('fuentes-de-poder', 'wattage', 'Potencia', 'Energía', 'W', 'number', true, 1),
    ('fuentes-de-poder', 'certification', 'Certificación', 'Energía', null, 'text', true, 2),
    ('fuentes-de-poder', 'modular', 'Cableado', 'Diseño', null, 'text', false, 3),
    ('fuentes-de-poder', 'form_factor', 'Formato', 'Diseño', null, 'text', false, 4),
    ('gabinetes', 'form_factor', 'Placas compatibles', 'Compatibilidad', null, 'text', true, 1),
    ('gabinetes', 'max_gpu_length', 'Longitud máxima de GPU', 'Compatibilidad', 'mm', 'number', false, 2),
    ('gabinetes', 'included_fans', 'Ventiladores incluidos', 'Refrigeración', null, 'number', false, 3),
    ('gabinetes', 'side_panel', 'Panel lateral', 'Diseño', null, 'text', false, 4),
    ('refrigeracion', 'cooling_type', 'Tipo', 'Diseño', null, 'text', true, 1),
    ('refrigeracion', 'socket_support', 'Sockets compatibles', 'Compatibilidad', null, 'text', false, 2),
    ('refrigeracion', 'radiator_size', 'Radiador / ventilador', 'Diseño', 'mm', 'number', false, 3),
    ('refrigeracion', 'tdp_rating', 'Capacidad térmica', 'Rendimiento', 'W', 'number', false, 4),
    ('computadores', 'cpu', 'Procesador', 'Componentes', null, 'text', false, 1),
    ('computadores', 'gpu', 'Tarjeta gráfica', 'Componentes', null, 'text', false, 2),
    ('computadores', 'ram', 'Memoria RAM', 'Componentes', null, 'text', false, 3),
    ('computadores', 'storage', 'Almacenamiento', 'Componentes', null, 'text', false, 4),
    ('computadores', 'psu', 'Fuente de poder', 'Componentes', null, 'text', false, 5),
    ('computadores', 'estimated_power', 'Consumo estimado', 'Energía', 'W', 'number', false, 6),
    ('computadores', 'os', 'Sistema operativo', 'Software', null, 'text', false, 7),
    ('monitores', 'size', 'Tamaño', 'Pantalla', 'pulgadas', 'number', true, 1),
    ('monitores', 'resolution', 'Resolución', 'Pantalla', null, 'text', true, 2),
    ('monitores', 'refresh_rate', 'Frecuencia', 'Pantalla', 'Hz', 'number', true, 3),
    ('monitores', 'panel', 'Panel', 'Pantalla', null, 'text', false, 4),
    ('monitores', 'response_time', 'Tiempo de respuesta', 'Pantalla', 'ms', 'number', false, 5)
  ) as s(cat, key, label, grp, unit, dtype, filterable, pos)
  join public.categories c on c.slug = s.cat;

  -- Productos ------------------------------------------------------------------
  insert into public.products (
    name, slug, sku, product_type, short_description, description, price, compare_at_price,
    brand_id, category_id, stock, low_stock_threshold, warranty_months, is_active, is_featured
  )
  select
    p.name, p.slug, p.sku, p.ptype::public.product_type, p.short,
    'Producto de demostración: marca, modelo, precio e inventario son ficticios y se usan solo para probar la tienda.' || E'\n\n' || p.long,
    p.price, p.compare, b.id, c.id, p.stock, 3, p.warranty, true, p.featured
  from (values
    -- name, slug, sku, type, brand, category, price, compare, stock, warranty, featured, short, long
    ('Tarjeta gráfica Voltaris VX 8 GB', 'tarjeta-grafica-voltaris-vx-8gb', 'DEMO-GPU-VX8', 'component', 'voltaris', 'tarjetas-graficas', 1599900, null, 14, 36, false,
     'GPU de 8 GB para jugar en 1080p con buen consumo y tamaño compacto.',
     'Una tarjeta pensada para equipos de entrada y gabinetes pequeños. Su longitud contenida y consumo moderado permiten usarla con fuentes de 550 W.'),
    ('Tarjeta gráfica Voltaris VX 12 GB GDDR7', 'tarjeta-grafica-voltaris-vx-12gb-gddr7', 'DEMO-GPU-VX12', 'component', 'voltaris', 'tarjetas-graficas', 2849900, 3239900, 6, 36, true,
     '12 GB GDDR7 para jugar en 1440p y acelerar edición de video.',
     'El punto de equilibrio para 1440p. La memoria GDDR7 y la interfaz PCIe 5.0 la hacen apta para juegos actuales y flujos de trabajo creativos.'),
    ('Tarjeta gráfica Arcanum RG 16 GB', 'tarjeta-grafica-arcanum-rg-16gb', 'DEMO-GPU-RG16', 'component', 'arcanum', 'tarjetas-graficas', 4199900, null, 2, 36, false,
     '16 GB de memoria para 4K, renderizado 3D y cargas de IA local.',
     'Para quienes trabajan con escenas pesadas o juegan en 4K. Requiere un gabinete con espacio para tarjetas de más de 300 mm.'),
    ('Procesador Northbyte N5 6 núcleos AM5', 'procesador-northbyte-n5-6-nucleos-am5', 'DEMO-CPU-N5', 'component', 'northbyte', 'procesadores', 849900, null, 20, 36, false,
     '6 núcleos y 12 hilos para gaming y tareas de oficina.',
     'Un procesador eficiente para equipos de gaming de entrada. Incluye gráficos integrados, útiles mientras eliges tarjeta gráfica.'),
    ('Procesador Northbyte N7 8 núcleos AM5', 'procesador-northbyte-n7-8-nucleos-am5', 'DEMO-CPU-N7', 'component', 'northbyte', 'procesadores', 1389900, 1549900, 9, 36, true,
     '8 núcleos de alto rendimiento para gaming exigente y streaming.',
     'Frecuencias altas y 8 núcleos para jugar y transmitir al mismo tiempo. Compatible con placas AM5 y memoria DDR5.'),
    ('Procesador Arcanum Core A9 16 núcleos', 'procesador-arcanum-core-a9-16-nucleos', 'DEMO-CPU-A9', 'component', 'arcanum', 'procesadores', 2799900, null, 0, 36, false,
     '16 núcleos para renderizado, compilación y edición profesional.',
     'Pensado para estaciones de trabajo. Requiere refrigeración líquida o un disipador de alta capacidad.'),
    ('Memoria RAM Kairos DDR5 16 GB (2×8) 5600 MHz', 'memoria-ram-kairos-ddr5-16gb-5600', 'DEMO-RAM-D5-16', 'component', 'kairos', 'memorias-ram', 239900, null, 30, 60, false,
     'Kit de doble canal DDR5 para equipos de entrada.',
     'Dos módulos de 8 GB en doble canal. Una base sólida para equipos AM5 y LGA1851.'),
    ('Memoria RAM Kairos DDR5 32 GB (2×16) 6000 MHz CL30', 'memoria-ram-kairos-ddr5-32gb-6000-cl30', 'DEMO-RAM-D5-32', 'component', 'kairos', 'memorias-ram', 489900, null, 3, 60, true,
     'El kit recomendado para gaming en AM5: 6000 MHz con latencia CL30.',
     'Velocidad y latencia equilibradas para aprovechar los procesadores actuales. Incluye perfiles de overclock automático.'),
    ('Memoria RAM Kairos DDR4 16 GB 3200 MHz', 'memoria-ram-kairos-ddr4-16gb-3200', 'DEMO-RAM-D4-16', 'component', 'kairos', 'memorias-ram', 169900, 189900, 12, 60, false,
     'Módulo DDR4 para actualizar equipos de generaciones anteriores.',
     'Una forma económica de dar más vida a un equipo con placa DDR4.'),
    ('SSD NVMe Kairos Gen4 1 TB', 'ssd-nvme-kairos-gen4-1tb', 'DEMO-SSD-G4-1T', 'component', 'kairos', 'almacenamiento', 289900, null, 25, 60, false,
     '1 TB NVMe PCIe 4.0 con lectura de hasta 7000 MB/s.',
     'Arranque y cargas de juego casi instantáneos. Formato M.2 2280.'),
    ('SSD NVMe Kairos Gen4 2 TB', 'ssd-nvme-kairos-gen4-2tb', 'DEMO-SSD-G4-2T', 'component', 'kairos', 'almacenamiento', 529900, 599900, 8, 60, true,
     '2 TB NVMe para bibliotecas de juegos grandes y proyectos de video.',
     'Espacio de sobra con velocidades PCIe 4.0. Ideal como unidad principal en equipos de creación.'),
    ('SSD SATA Kairos 1 TB', 'ssd-sata-kairos-1tb', 'DEMO-SSD-SATA-1T', 'component', 'kairos', 'almacenamiento', 219900, null, 0, 36, false,
     'SSD de 2,5" para revivir portátiles y equipos sin ranura M.2.',
     'Compatible con cualquier equipo con puerto SATA. Mucho más rápido que un disco duro mecánico.'),
    ('Placa madre Northbyte B650M AM5', 'placa-madre-northbyte-b650m-am5', 'DEMO-MB-B650M', 'component', 'northbyte', 'placas-madre', 739900, null, 11, 36, false,
     'Micro-ATX AM5 con DDR5 y dos ranuras M.2.',
     'La base más equilibrada para armar un equipo AM5 compacto.'),
    ('Placa madre Northbyte X870 ATX', 'placa-madre-northbyte-x870-atx', 'DEMO-MB-X870', 'component', 'northbyte', 'placas-madre', 1459900, null, 4, 36, false,
     'ATX AM5 de gama alta con PCIe 5.0 y cuatro ranuras M.2.',
     'Para equipos sin compromisos: conectividad amplia y fases de poder robustas.'),
    ('Placa madre Arcanum Z890 ATX LGA1851', 'placa-madre-arcanum-z890-atx-lga1851', 'DEMO-MB-Z890', 'component', 'arcanum', 'placas-madre', 1299900, 1399900, 5, 36, false,
     'ATX LGA1851 con DDR5 y soporte de overclock.',
     'Compatible con procesadores LGA1851. Incluye tres ranuras M.2.'),
    ('Fuente de poder Helion 650 W 80 Plus Bronze', 'fuente-de-poder-helion-650w-bronze', 'DEMO-PSU-650B', 'component', 'helion', 'fuentes-de-poder', 279900, null, 18, 36, false,
     '650 W con certificación Bronze para equipos de gaming de entrada.',
     'Potencia suficiente para combinaciones de procesador de 6 núcleos y tarjeta gráfica de gama media.'),
    ('Fuente de poder Helion 850 W 80 Plus Gold modular', 'fuente-de-poder-helion-850w-gold-modular', 'DEMO-PSU-850G', 'component', 'helion', 'fuentes-de-poder', 549900, null, 7, 84, true,
     '850 W Gold totalmente modular con conector de 16 pines.',
     'Cableado modular para un armado limpio y eficiencia Gold para menos calor y ruido.'),
    ('Fuente de poder Helion 1000 W 80 Plus Gold', 'fuente-de-poder-helion-1000w-gold', 'DEMO-PSU-1000G', 'component', 'helion', 'fuentes-de-poder', 819900, null, 2, 84, false,
     '1000 W para equipos con tarjetas gráficas de alto consumo.',
     'Margen amplio para estaciones de trabajo y futuras actualizaciones.'),
    ('Gabinete Strata M3 Micro-ATX', 'gabinete-strata-m3-micro-atx', 'DEMO-CASE-M3', 'component', 'strata', 'gabinetes', 249900, null, 10, 12, false,
     'Gabinete compacto con frente perforado y dos ventiladores.',
     'Ocupa poco espacio en el escritorio sin sacrificar flujo de aire.'),
    ('Gabinete Strata A5 ATX vidrio templado', 'gabinete-strata-a5-atx-vidrio', 'DEMO-CASE-A5', 'component', 'strata', 'gabinetes', 389900, 429900, 6, 12, false,
     'ATX con panel de vidrio templado y espacio para GPU de 360 mm.',
     'Muestra tu armado con un panel lateral de vidrio y gestión de cables trasera.'),
    ('Gabinete Strata A7 Airflow', 'gabinete-strata-a7-airflow', 'DEMO-CASE-A7', 'component', 'strata', 'gabinetes', 469900, null, 0, 12, false,
     'Frente de malla y cuatro ventiladores para máximo flujo de aire.',
     'Pensado para tarjetas gráficas grandes y refrigeración líquida de 360 mm.'),
    ('Disipador Frostline Air 120', 'disipador-frostline-air-120', 'DEMO-COOL-A120', 'component', 'frostline', 'refrigeracion', 119900, null, 22, 24, false,
     'Disipador de torre con ventilador de 120 mm, silencioso y compatible con AM5 y LGA1851.',
     'Mejora notable frente al disipador de caja con un nivel de ruido bajo.'),
    ('Refrigeración líquida Frostline AIO 240', 'refrigeracion-liquida-frostline-aio-240', 'DEMO-COOL-AIO240', 'component', 'frostline', 'refrigeracion', 389900, null, 5, 60, false,
     'AIO de 240 mm para procesadores de 8 núcleos.',
     'Temperaturas estables en sesiones largas de juego y edición.'),
    ('Refrigeración líquida Frostline AIO 360', 'refrigeracion-liquida-frostline-aio-360', 'DEMO-COOL-AIO360', 'component', 'frostline', 'refrigeracion', 549900, 619900, 3, 60, false,
     'AIO de 360 mm para procesadores de alto consumo.',
     'La opción para procesadores de 16 núcleos y overclock.'),
    ('PC Gamer Inicial N5 · VX 8 GB', 'pc-gamer-inicial-n5-vx-8gb', 'DEMO-PC-INICIAL', 'prebuilt', null, 'computadores', 4899900, null, 4, 12, false,
     'Equipo armado para jugar en 1080p: 6 núcleos, 8 GB de video y SSD de 1 TB.',
     'Una configuración equilibrada para empezar en el gaming de PC, armada y probada.'),
    ('PC Gamer Avanzado N7 · VX 12 GB', 'pc-gamer-avanzado-n7-vx-12gb', 'DEMO-PC-AVANZADO', 'prebuilt', null, 'computadores', 7499900, 7999900, 3, 12, true,
     'Equipo armado para 1440p con 8 núcleos, 12 GB GDDR7 y 32 GB DDR5.',
     'Pensado para jugar en 1440p con altas tasas de cuadros y transmitir al mismo tiempo.'),
    ('Estación Creator A9 · RG 16 GB', 'estacion-creator-a9-rg-16gb', 'DEMO-PC-CREATOR', 'prebuilt', null, 'computadores', 12999900, null, 1, 12, false,
     'Estación de trabajo de 16 núcleos para render 3D, edición 4K e IA local.',
     'Para profesionales que necesitan potencia sostenida, con refrigeración líquida de 360 mm.'),
    ('Monitor Lumen 24" 165 Hz IPS', 'monitor-lumen-24-165hz-ips', 'DEMO-MON-24', 'peripheral', 'lumen', 'monitores', 689900, null, 9, 36, false,
     '24 pulgadas Full HD a 165 Hz con panel IPS.',
     'Fluidez para juegos competitivos con colores precisos.'),
    ('Monitor Lumen 27" QHD 180 Hz', 'monitor-lumen-27-qhd-180hz', 'DEMO-MON-27', 'peripheral', 'lumen', 'monitores', 1189900, 1299900, 5, 36, true,
     '27 pulgadas 2560×1440 a 180 Hz: el punto ideal para 1440p.',
     'Más espacio de trabajo y nitidez que Full HD, con la fluidez que piden los juegos.'),
    ('Monitor Lumen 34" ultrawide 144 Hz', 'monitor-lumen-34-ultrawide-144hz', 'DEMO-MON-34', 'peripheral', 'lumen', 'monitores', 1899900, null, 2, 36, false,
     'Ultrawide curvo de 34 pulgadas para simulación y productividad.',
     'Formato 21:9 para ver más en juegos de carreras, edición y hojas de cálculo.')
  ) as p(name, slug, sku, ptype, brand, cat, price, compare, stock, warranty, featured, short, long)
  join public.categories c on c.slug = p.cat
  left join public.brands b on b.slug = p.brand;

  -- Valores de especificaciones (el tipo se resuelve según la definición) -------
  insert into public.product_specs (product_id, spec_id, value_text, value_number, value_boolean)
  select pr.id, sd.id,
    case when sd.data_type = 'text' then v.val end,
    case when sd.data_type = 'number' then v.val::numeric end,
    case when sd.data_type = 'boolean' then v.val::boolean end
  from (values
    ('DEMO-GPU-VX8', 'vram', '8'), ('DEMO-GPU-VX8', 'memory_type', 'GDDR6'), ('DEMO-GPU-VX8', 'interface', 'PCIe 4.0 x8'),
    ('DEMO-GPU-VX8', 'outputs', '3× DisplayPort 1.4a, 1× HDMI 2.1'), ('DEMO-GPU-VX8', 'tdp', '145'), ('DEMO-GPU-VX8', 'recommended_psu', '550'), ('DEMO-GPU-VX8', 'length', '240'),
    ('DEMO-GPU-VX12', 'vram', '12'), ('DEMO-GPU-VX12', 'memory_type', 'GDDR7'), ('DEMO-GPU-VX12', 'interface', 'PCIe 5.0 x16'),
    ('DEMO-GPU-VX12', 'outputs', '3× DisplayPort 2.1, 1× HDMI 2.1'), ('DEMO-GPU-VX12', 'tdp', '250'), ('DEMO-GPU-VX12', 'recommended_psu', '650'), ('DEMO-GPU-VX12', 'length', '285'),
    ('DEMO-GPU-RG16', 'vram', '16'), ('DEMO-GPU-RG16', 'memory_type', 'GDDR7'), ('DEMO-GPU-RG16', 'interface', 'PCIe 5.0 x16'),
    ('DEMO-GPU-RG16', 'outputs', '3× DisplayPort 2.1, 1× HDMI 2.1'), ('DEMO-GPU-RG16', 'tdp', '320'), ('DEMO-GPU-RG16', 'recommended_psu', '850'), ('DEMO-GPU-RG16', 'length', '322'),
    ('DEMO-CPU-N5', 'socket', 'AM5'), ('DEMO-CPU-N5', 'cores', '6'), ('DEMO-CPU-N5', 'threads', '12'), ('DEMO-CPU-N5', 'boost_clock', '5.3'), ('DEMO-CPU-N5', 'tdp', '65'), ('DEMO-CPU-N5', 'integrated_graphics', 'true'),
    ('DEMO-CPU-N7', 'socket', 'AM5'), ('DEMO-CPU-N7', 'cores', '8'), ('DEMO-CPU-N7', 'threads', '16'), ('DEMO-CPU-N7', 'boost_clock', '5.5'), ('DEMO-CPU-N7', 'tdp', '120'), ('DEMO-CPU-N7', 'integrated_graphics', 'true'),
    ('DEMO-CPU-A9', 'socket', 'LGA1851'), ('DEMO-CPU-A9', 'cores', '16'), ('DEMO-CPU-A9', 'threads', '24'), ('DEMO-CPU-A9', 'boost_clock', '5.7'), ('DEMO-CPU-A9', 'tdp', '125'), ('DEMO-CPU-A9', 'integrated_graphics', 'false'),
    ('DEMO-RAM-D5-16', 'capacity', '16'), ('DEMO-RAM-D5-16', 'memory_type', 'DDR5'), ('DEMO-RAM-D5-16', 'modules', '2 × 8 GB'), ('DEMO-RAM-D5-16', 'speed', '5600'), ('DEMO-RAM-D5-16', 'latency', 'CL36'),
    ('DEMO-RAM-D5-32', 'capacity', '32'), ('DEMO-RAM-D5-32', 'memory_type', 'DDR5'), ('DEMO-RAM-D5-32', 'modules', '2 × 16 GB'), ('DEMO-RAM-D5-32', 'speed', '6000'), ('DEMO-RAM-D5-32', 'latency', 'CL30'),
    ('DEMO-RAM-D4-16', 'capacity', '16'), ('DEMO-RAM-D4-16', 'memory_type', 'DDR4'), ('DEMO-RAM-D4-16', 'modules', '1 × 16 GB'), ('DEMO-RAM-D4-16', 'speed', '3200'), ('DEMO-RAM-D4-16', 'latency', 'CL16'),
    ('DEMO-SSD-G4-1T', 'capacity', '1000'), ('DEMO-SSD-G4-1T', 'interface', 'NVMe PCIe 4.0'), ('DEMO-SSD-G4-1T', 'form_factor', 'M.2 2280'), ('DEMO-SSD-G4-1T', 'read_speed', '7000'), ('DEMO-SSD-G4-1T', 'write_speed', '6000'),
    ('DEMO-SSD-G4-2T', 'capacity', '2000'), ('DEMO-SSD-G4-2T', 'interface', 'NVMe PCIe 4.0'), ('DEMO-SSD-G4-2T', 'form_factor', 'M.2 2280'), ('DEMO-SSD-G4-2T', 'read_speed', '7300'), ('DEMO-SSD-G4-2T', 'write_speed', '6800'),
    ('DEMO-SSD-SATA-1T', 'capacity', '1000'), ('DEMO-SSD-SATA-1T', 'interface', 'SATA III'), ('DEMO-SSD-SATA-1T', 'form_factor', '2,5"'), ('DEMO-SSD-SATA-1T', 'read_speed', '550'), ('DEMO-SSD-SATA-1T', 'write_speed', '520'),
    ('DEMO-MB-B650M', 'socket', 'AM5'), ('DEMO-MB-B650M', 'chipset', 'B650'), ('DEMO-MB-B650M', 'form_factor', 'Micro-ATX'), ('DEMO-MB-B650M', 'memory_type', 'DDR5'), ('DEMO-MB-B650M', 'memory_slots', '4'), ('DEMO-MB-B650M', 'm2_slots', '2'),
    ('DEMO-MB-X870', 'socket', 'AM5'), ('DEMO-MB-X870', 'chipset', 'X870'), ('DEMO-MB-X870', 'form_factor', 'ATX'), ('DEMO-MB-X870', 'memory_type', 'DDR5'), ('DEMO-MB-X870', 'memory_slots', '4'), ('DEMO-MB-X870', 'm2_slots', '4'),
    ('DEMO-MB-Z890', 'socket', 'LGA1851'), ('DEMO-MB-Z890', 'chipset', 'Z890'), ('DEMO-MB-Z890', 'form_factor', 'ATX'), ('DEMO-MB-Z890', 'memory_type', 'DDR5'), ('DEMO-MB-Z890', 'memory_slots', '4'), ('DEMO-MB-Z890', 'm2_slots', '3'),
    ('DEMO-PSU-650B', 'wattage', '650'), ('DEMO-PSU-650B', 'certification', '80 Plus Bronze'), ('DEMO-PSU-650B', 'modular', 'No modular'), ('DEMO-PSU-650B', 'form_factor', 'ATX'),
    ('DEMO-PSU-850G', 'wattage', '850'), ('DEMO-PSU-850G', 'certification', '80 Plus Gold'), ('DEMO-PSU-850G', 'modular', 'Totalmente modular'), ('DEMO-PSU-850G', 'form_factor', 'ATX 3.1'),
    ('DEMO-PSU-1000G', 'wattage', '1000'), ('DEMO-PSU-1000G', 'certification', '80 Plus Gold'), ('DEMO-PSU-1000G', 'modular', 'Totalmente modular'), ('DEMO-PSU-1000G', 'form_factor', 'ATX 3.1'),
    ('DEMO-CASE-M3', 'form_factor', 'Micro-ATX, Mini-ITX'), ('DEMO-CASE-M3', 'max_gpu_length', '300'), ('DEMO-CASE-M3', 'included_fans', '2'), ('DEMO-CASE-M3', 'side_panel', 'Acero'),
    ('DEMO-CASE-A5', 'form_factor', 'ATX, Micro-ATX, Mini-ITX'), ('DEMO-CASE-A5', 'max_gpu_length', '360'), ('DEMO-CASE-A5', 'included_fans', '3'), ('DEMO-CASE-A5', 'side_panel', 'Vidrio templado'),
    ('DEMO-CASE-A7', 'form_factor', 'E-ATX, ATX, Micro-ATX'), ('DEMO-CASE-A7', 'max_gpu_length', '400'), ('DEMO-CASE-A7', 'included_fans', '4'), ('DEMO-CASE-A7', 'side_panel', 'Vidrio templado'),
    ('DEMO-COOL-A120', 'cooling_type', 'Aire'), ('DEMO-COOL-A120', 'socket_support', 'AM5, AM4, LGA1851, LGA1700'), ('DEMO-COOL-A120', 'radiator_size', '120'), ('DEMO-COOL-A120', 'tdp_rating', '180'),
    ('DEMO-COOL-AIO240', 'cooling_type', 'Líquida AIO'), ('DEMO-COOL-AIO240', 'socket_support', 'AM5, AM4, LGA1851, LGA1700'), ('DEMO-COOL-AIO240', 'radiator_size', '240'), ('DEMO-COOL-AIO240', 'tdp_rating', '250'),
    ('DEMO-COOL-AIO360', 'cooling_type', 'Líquida AIO'), ('DEMO-COOL-AIO360', 'socket_support', 'AM5, AM4, LGA1851, LGA1700'), ('DEMO-COOL-AIO360', 'radiator_size', '360'), ('DEMO-COOL-AIO360', 'tdp_rating', '300'),
    ('DEMO-PC-INICIAL', 'cpu', 'Northbyte N5 · 6 núcleos'), ('DEMO-PC-INICIAL', 'gpu', 'Voltaris VX · 8 GB GDDR6'), ('DEMO-PC-INICIAL', 'ram', '16 GB DDR5-5600'),
    ('DEMO-PC-INICIAL', 'storage', '1 TB NVMe Gen4'), ('DEMO-PC-INICIAL', 'psu', '650 W 80 Plus Bronze'), ('DEMO-PC-INICIAL', 'estimated_power', '320'), ('DEMO-PC-INICIAL', 'os', 'Sin sistema operativo'),
    ('DEMO-PC-AVANZADO', 'cpu', 'Northbyte N7 · 8 núcleos'), ('DEMO-PC-AVANZADO', 'gpu', 'Voltaris VX · 12 GB GDDR7'), ('DEMO-PC-AVANZADO', 'ram', '32 GB DDR5-6000 CL30'),
    ('DEMO-PC-AVANZADO', 'storage', '1 TB NVMe Gen4'), ('DEMO-PC-AVANZADO', 'psu', '850 W 80 Plus Gold'), ('DEMO-PC-AVANZADO', 'estimated_power', '465'), ('DEMO-PC-AVANZADO', 'os', 'Sin sistema operativo'),
    ('DEMO-PC-CREATOR', 'cpu', 'Arcanum Core A9 · 16 núcleos'), ('DEMO-PC-CREATOR', 'gpu', 'Arcanum RG · 16 GB GDDR7'), ('DEMO-PC-CREATOR', 'ram', '64 GB DDR5-6000'),
    ('DEMO-PC-CREATOR', 'storage', '2 TB NVMe Gen4'), ('DEMO-PC-CREATOR', 'psu', '1000 W 80 Plus Gold'), ('DEMO-PC-CREATOR', 'estimated_power', '610'), ('DEMO-PC-CREATOR', 'os', 'Sin sistema operativo'),
    ('DEMO-MON-24', 'size', '24'), ('DEMO-MON-24', 'resolution', '1920 × 1080'), ('DEMO-MON-24', 'refresh_rate', '165'), ('DEMO-MON-24', 'panel', 'IPS'), ('DEMO-MON-24', 'response_time', '1'),
    ('DEMO-MON-27', 'size', '27'), ('DEMO-MON-27', 'resolution', '2560 × 1440'), ('DEMO-MON-27', 'refresh_rate', '180'), ('DEMO-MON-27', 'panel', 'IPS'), ('DEMO-MON-27', 'response_time', '1'),
    ('DEMO-MON-34', 'size', '34'), ('DEMO-MON-34', 'resolution', '3440 × 1440'), ('DEMO-MON-34', 'refresh_rate', '144'), ('DEMO-MON-34', 'panel', 'VA curvo'), ('DEMO-MON-34', 'response_time', '1')
  ) as v(sku, key, val)
  join public.products pr on pr.sku = v.sku
  join public.spec_definitions sd on sd.category_id = pr.category_id and sd.key = v.key;

  -- Movimiento inicial de inventario para cada producto con stock --------------
  insert into public.inventory_movements (product_id, movement_type, quantity, previous_stock, resulting_stock, reason)
  select id, 'initial', stock, 0, stock, 'Carga inicial de datos de demostración'
  from public.products
  where stock > 0;

  raise notice 'Datos de demostración cargados.';
end;
$$;
