#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script para analizar el contenido real del archivo DWG
Identifica perímetro, vialidades, puntos de referencia, etc.
"""

import ezdxf
from pathlib import Path
import json

class AnalizadorDWG:
    def __init__(self, primera_etapa):
        """Inicializar analizador"""
        self.archivo = primera_etapa
        
        try:
            self.doc = ezdxf.readfile(primera_etapa)
            print(f"✅ Archivo DWG cargado: {primera_etapa}")
        except FileNotFoundError:
            print(f"❌ Archivo no encontrado: {primera_etapa}")
            exit(1)
        
        self.msp = self.doc.modelspace()
        self.analisis = {
            'lineas': [],
            'polilineas': [],
            'circulos': [],
            'arcos': [],
            'textos': [],
            'bloques': [],
            'capas': [],
            'bounds': {
                'min_x': float('inf'),
                'min_y': float('inf'),
                'max_x': float('-inf'),
                'max_y': float('-inf')
            }
        }
    
    def analizar_lineas(self):
        """Analizar todas las líneas del DWG"""
        print("\n📍 Analizando LÍNEAS...")
        
        lineas = self.msp.query('LINE')
        print(f"   Total de líneas: {len(lineas)}")
        
        for idx, linea in enumerate(lineas):
            start = linea.dxf.start
            end = linea.dxf.end
            layer = linea.dxf.layer
            
            self.analisis['lineas'].append({
                'id': idx,
                'start': (start.x, start.y),
                'end': (end.x, end.y),
                'layer': layer,
                'length': linea.dxf.start.distance(linea.dxf.end)
            })
            
            # Actualizar bounds
            self._actualizar_bounds(start.x, start.y)
            self._actualizar_bounds(end.x, end.y)
            
            if idx < 5:
                print(f"   Línea {idx}: ({start.x:.2f}, {start.y:.2f}) → ({end.x:.2f}, {end.y:.2f}) [Capa: {layer}]")
        
        if len(lineas) > 5:
            print(f"   ... y {len(lineas) - 5} líneas más")
        
        return len(lineas)
    
    def analizar_polilineas(self):
        """Analizar todas las polilíneas del DWG"""
        print("\n📍 Analizando POLILÍNEAS...")
        
        polilineas = self.msp.query('LWPOLYLINE')
        print(f"   Total de polilíneas: {len(polilineas)}")
        
        for idx, poli in enumerate(polilineas):
            layer = poli.dxf.layer
            puntos = list(poli.get_points())
            
            self.analisis['polilineas'].append({
                'id': idx,
                'layer': layer,
                'puntos': len(puntos),
                'cerrada': poli.dxf.flags & 1 == 1,
                'coordenadas': [(p[0], p[1]) for p in puntos[:3]]  # Primeros 3 puntos
            })
            
            # Actualizar bounds
            for punto in puntos:
                self._actualizar_bounds(punto[0], punto[1])
            
            if idx < 5:
                print(f"   Polilínea {idx}: {len(puntos)} puntos, Cerrada: {poli.dxf.flags & 1 == 1}, Capa: {layer}")
        
        if len(polilineas) > 5:
            print(f"   ... y {len(polilineas) - 5} polilíneas más")
        
        return len(polilineas)
    
    def analizar_circulos(self):
        """Analizar todos los círculos del DWG"""
        print("\n📍 Analizando CÍRCULOS...")
        
        circulos = self.msp.query('CIRCLE')
        print(f"   Total de círculos: {len(circulos)}")
        
        for idx, circulo in enumerate(circulos):
            centro = circulo.dxf.center
            radio = circulo.dxf.radius
            layer = circulo.dxf.layer
            
            self.analisis['circulos'].append({
                'id': idx,
                'centro': (centro.x, centro.y),
                'radio': radio,
                'layer': layer
            })
            
            self._actualizar_bounds(centro.x - radio, centro.y - radio)
            self._actualizar_bounds(centro.x + radio, centro.y + radio)
            
            if idx < 5:
                print(f"   Círculo {idx}: Centro ({centro.x:.2f}, {centro.y:.2f}), Radio: {radio:.2f}, Capa: {layer}")
        
        if len(circulos) > 5:
            print(f"   ... y {len(circulos) - 5} círculos más")
        
        return len(circulos)
    
    def analizar_arcos(self):
        """Analizar todos los arcos del DWG"""
        print("\n📍 Analizando ARCOS...")
        
        arcos = self.msp.query('ARC')
        print(f"   Total de arcos: {len(arcos)}")
        
        for idx, arco in enumerate(arcos):
            centro = arco.dxf.center
            radio = arco.dxf.radius
            layer = arco.dxf.layer
            
            self.analisis['arcos'].append({
                'id': idx,
                'centro': (centro.x, centro.y),
                'radio': radio,
                'start_angle': arco.dxf.start_angle,
                'end_angle': arco.dxf.end_angle,
                'layer': layer
            })
            
            self._actualizar_bounds(centro.x - radio, centro.y - radio)
            self._actualizar_bounds(centro.x + radio, centro.y + radio)
            
            if idx < 3:
                print(f"   Arco {idx}: Centro ({centro.x:.2f}, {centro.y:.2f}), Radio: {radio:.2f}, Capa: {layer}")
        
        if len(arcos) > 3:
            print(f"   ... y {len(arcos) - 3} arcos más")
        
        return len(arcos)
    
    def analizar_textos(self):
        """Analizar todos los textos del DWG"""
        print("\n📍 Analizando TEXTOS...")
        
        textos = self.msp.query('TEXT')
        print(f"   Total de textos: {len(textos)}")
        
        for idx, texto in enumerate(textos):
            contenido = texto.dxf.text
            posicion = texto.dxf.insert
            layer = texto.dxf.layer
            
            self.analisis['textos'].append({
                'id': idx,
                'contenido': contenido,
                'posicion': (posicion.x, posicion.y),
                'layer': layer
            })
            
            if idx < 10:
                print(f"   Texto {idx}: '{contenido}' en ({posicion.x:.2f}, {posicion.y:.2f}), Capa: {layer}")
        
        if len(textos) > 10:
            print(f"   ... y {len(textos) - 10} textos más")
        
        return len(textos)
    
    def analizar_bloques(self):
        """Analizar todos los bloques del DWG"""
        print("\n📍 Analizando BLOQUES...")
        
        bloques = self.msp.query('INSERT')
        print(f"   Total de bloques insertados: {len(bloques)}")
        
        for idx, bloque in enumerate(bloques):
            nombre = bloque.dxf.name
            posicion = bloque.dxf.insert
            layer = bloque.dxf.layer
            
            self.analisis['bloques'].append({
                'id': idx,
                'nombre': nombre,
                'posicion': (posicion.x, posicion.y),
                'layer': layer
            })
            
            if idx < 5:
                print(f"   Bloque {idx}: '{nombre}' en ({posicion.x:.2f}, {posicion.y:.2f}), Capa: {layer}")
        
        if len(bloques) > 5:
            print(f"   ... y {len(bloques) - 5} bloques más")
        
        return len(bloques)
    
    def analizar_capas(self):
        """Analizar todas las capas del DWG"""
        print("\n📍 Analizando CAPAS...")
        
        capas = self.doc.layers
        print(f"   Total de capas: {len(capas)}")
        
        for idx, capa in enumerate(capas):
            self.analisis['capas'].append({
                'nombre': capa.dxf.name,
                'color': capa.dxf.color,
                'linetype': capa.dxf.linetype,
                'locked': capa.dxf.flags & 4 == 4
            })
            
            print(f"   Capa {idx}: '{capa.dxf.name}' (Color: {capa.dxf.color}, Linetype: {capa.dxf.linetype})")
        
        return len(capas)
    
    def _actualizar_bounds(self, x, y):
        """Actualizar límites del dibujo"""
        self.analisis['bounds']['min_x'] = min(self.analisis['bounds']['min_x'], x)
        self.analisis['bounds']['min_y'] = min(self.analisis['bounds']['min_y'], y)
        self.analisis['bounds']['max_x'] = max(self.analisis['bounds']['max_x'], x)
        self.analisis['bounds']['max_y'] = max(self.analisis['bounds']['max_y'], y)
    
    def ejecutar_analisis_completo(self):
        """Ejecutar análisis completo"""
        print("=" * 70)
        print("🔍 ANÁLISIS COMPLETO DEL ARCHIVO DWG")
        print("=" * 70)
        
        total_lineas = self.analizar_lineas()
        total_polilineas = self.analizar_polilineas()
        total_circulos = self.analizar_circulos()
        total_arcos = self.analizar_arcos()
        total_textos = self.analizar_textos()
        total_bloques = self.analizar_bloques()
        total_capas = self.analizar_capas()
        
        # Mostrar resumen
        print("\n" + "=" * 70)
        print("📊 RESUMEN DEL ANÁLISIS")
        print("=" * 70)
        print(f"Líneas:        {total_lineas}")
        print(f"Polilíneas:    {total_polilineas}")
        print(f"Círculos:      {total_circulos}")
        print(f"Arcos:         {total_arcos}")
        print(f"Textos:        {total_textos}")
        print(f"Bloques:       {total_bloques}")
        print(f"Capas:         {total_capas}")
        
        print(f"\n📐 LÍMITES DEL DIBUJO:")
        print(f"   X: {self.analisis['bounds']['min_x']:.2f} → {self.analisis['bounds']['max_x']:.2f}")
        print(f"   Y: {self.analisis['bounds']['min_y']:.2f} → {self.analisis['bounds']['max_y']:.2f}")
        print(f"   Ancho:  {self.analisis['bounds']['max_x'] - self.analisis['bounds']['min_x']:.2f} m")
        print(f"   Alto:   {self.analisis['bounds']['max_y'] - self.analisis['bounds']['min_y']:.2f} m")
        
        return self.analisis
    
    def guardar_analisis(self):
        """Guardar análisis en JSON"""
        output_path = Path(self.archivo).parent / 'analisis-dwg.json'
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.analisis, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Análisis guardado en: {output_path}")
            return True
        except Exception as e:
            print(f"❌ Error guardando análisis: {e}")
            return False


def main():
    """Función principal"""
    primera_etapa = 'primera_etapa.dxf'
    
    analizador = AnalizadorDWG(primera_etapa)
    analisis = analizador.ejecutar_analisis_completo()
    analizador.guardar_analisis()
    
    print("\n✅ Análisis completado")


if __name__ == '__main__':
    main()
