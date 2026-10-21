/**
 * ByteBook — 16-Bit Pixel Technical Schematic & Extracted Image Renderer
 * Renders both real extracted EPUB/PDF images (`data:image/...` or `file://`)
 * and ultra-crisp 16-bit SVG Computer Science & AI technical diagrams.
 */

import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { BookFigureRecord } from '../../services/parser';
import { useThemeStore } from '../../store';

export interface PixelFigureDiagramProps {
  figure: BookFigureRecord;
  width?: number;
  height?: number;
}

export const PixelFigureDiagram: React.FC<PixelFigureDiagramProps> = ({
  figure,
  width = 340,
  height = 200,
}) => {
  const { theme } = useThemeStore();
  const { colors } = theme;

  // If the figure is an extracted bitmap image from an EPUB/PDF file
  if (
    figure.localUri &&
    (figure.localUri.startsWith('data:image/') ||
      figure.localUri.startsWith('file://') ||
      figure.localUri.startsWith('http://') ||
      figure.localUri.startsWith('https://'))
  ) {
    return (
      <View style={[styles.imageWrap, { width, height, backgroundColor: colors.surfaceInset }]}>
        <Image
          source={{ uri: figure.localUri }}
          style={{ width, height }}
          contentFit="contain"
        />
      </View>
    );
  }

  const key = figure.svgDiagramKey || 'transformer_attention';

  return (
    <View
      style={[
        styles.svgContainer,
        { width, height, backgroundColor: '#101814' },
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 360 210">
        {/* Retro CRT Pixel Grid Background */}
        <Rect x="0" y="0" width="360" height="210" fill="#0F1713" />
        <Rect
          x="4"
          y="4"
          width="352"
          height="202"
          fill="none"
          stroke="#2E6F52"
          strokeWidth="2"
        />

        {/* Top HUD Banner inside Diagram */}
        <Rect x="8" y="8" width="344" height="22" fill="#182820" />
        <SvgText
          x="16"
          y="23"
          fill="#FFB000"
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {`[FIG.${figure.figureNumber}] // ${
            figure.title?.toUpperCase().slice(0, 38) || 'SCHEMATIC'
          }`}
        </SvgText>

        {key === 'transformer_attention' && (
          <>
            {/* Q, K, V Input Tensors */}
            <Rect x="20" y="50" width="66" height="32" fill="#1F3A52" stroke="#00E5FF" strokeWidth="2" />
            <SvgText x="30" y="70" fill="#00E5FF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              QUERY (Q)
            </SvgText>

            <Rect x="20" y="96" width="66" height="32" fill="#1F3A52" stroke="#00E5FF" strokeWidth="2" />
            <SvgText x="34" y="116" fill="#00E5FF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              KEY (K)
            </SvgText>

            <Rect x="20" y="142" width="66" height="32" fill="#2D4A36" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="28" y="162" fill="#72F1B8" fontSize="11" fontFamily="monospace" fontWeight="bold">
              VALUE (V)
            </SvgText>

            {/* MatMul Q x K^T */}
            <Line x1="86" y1="66" x2="125" y2="85" stroke="#00E5FF" strokeWidth="2" />
            <Line x1="86" y1="112" x2="125" y2="95" stroke="#00E5FF" strokeWidth="2" />
            <Rect x="125" y="70" width="76" height="40" fill="#3B2318" stroke="#FFB000" strokeWidth="2" />
            <SvgText x="133" y="88" fill="#FFB000" fontSize="10" fontFamily="monospace" fontWeight="bold">
              Q · K^T
            </SvgText>
            <SvgText x="133" y="102" fill="#FFFDF7" fontSize="9" fontFamily="monospace">
              / sqrt(d_k)
            </SvgText>

            {/* Softmax */}
            <Line x1="201" y1="90" x2="225" y2="90" stroke="#FFB000" strokeWidth="2" />
            <Rect x="225" y="70" width="62" height="40" fill="#3A1C2E" stroke="#FF70A6" strokeWidth="2" />
            <SvgText x="233" y="93" fill="#FF70A6" fontSize="10" fontFamily="monospace" fontWeight="bold">
              SOFTMAX
            </SvgText>

            {/* Output Attention */}
            <Line x1="86" y1="158" x2="256" y2="158" stroke="#72F1B8" strokeWidth="2" />
            <Line x1="256" y1="110" x2="256" y2="142" stroke="#FF70A6" strokeWidth="2" />
            <Rect x="225" y="142" width="115" height="36" fill="#1B4332" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="234" y="164" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              ATTN OUTPUT (Z)
            </SvgText>
          </>
        )}

        {key === 'memory_hierarchy' && (
          <>
            {/* Top Pyramid: SRAM */}
            <Path d="M180 42 L240 86 L120 86 Z" fill="#C84B31" stroke="#FFD166" strokeWidth="2" />
            <SvgText x="150" y="78" fill="#FFFDF7" fontSize="10" fontFamily="monospace" fontWeight="bold">
              SRAM 19TB/s
            </SvgText>

            {/* Middle: HBM */}
            <Path d="M115 94 L245 94 L280 140 L80 140 Z" fill="#2D6A4F" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="124" y="122" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              GPU HBM3 (3.3 TB/s)
            </SvgText>

            {/* Base: Host DRAM / SSD */}
            <Path d="M75 148 L285 148 L320 192 L40 192 Z" fill="#1F3A52" stroke="#00E5FF" strokeWidth="2" />
            <SvgText x="105" y="175" fill="#00E5FF" fontSize="10" fontFamily="monospace" fontWeight="bold">
              CPU DRAM / NVMe PCIe
            </SvgText>
          </>
        )}

        {key === 'jit_compiler_pipeline' && (
          <>
            <Rect x="16" y="54" width="68" height="44" fill="#1F3A52" stroke="#00E5FF" strokeWidth="2" />
            <SvgText x="24" y="74" fill="#00E5FF" fontSize="10" fontFamily="monospace" fontWeight="bold">
              SOURCE
            </SvgText>
            <SvgText x="24" y="88" fill="#FFFDF7" fontSize="9" fontFamily="monospace">
              AST Tree
            </SvgText>

            <Line x1="84" y1="76" x2="108" y2="76" stroke="#00E5FF" strokeWidth="2" />
            <Rect x="108" y="54" width="76" height="44" fill="#2D4A36" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="116" y="74" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              BYTECODE
            </SvgText>
            <SvgText x="116" y="88" fill="#FFFDF7" fontSize="9" fontFamily="monospace">
              Interpreter
            </SvgText>

            <Line x1="184" y1="76" x2="208" y2="76" stroke="#FFB000" strokeWidth="2" />
            <Rect x="208" y="54" width="132" height="44" fill="#3B2318" stroke="#FFB000" strokeWidth="2" />
            <SvgText x="218" y="74" fill="#FFB000" fontSize="10" fontFamily="monospace" fontWeight="bold">
              TURBO JIT COMPILER
            </SvgText>
            <SvgText x="218" y="88" fill="#FFFDF7" fontSize="9" fontFamily="monospace">
              Native Machine Code
            </SvgText>

            {/* Profiler Feedback Loop */}
            <Rect x="108" y="130" width="232" height="42" fill="#2A1D32" stroke="#FF70A6" strokeWidth="2" />
            <SvgText x="120" y="155" fill="#FF70A6" fontSize="10" fontFamily="monospace" fontWeight="bold">
              PROFILER: HOT LOOP & TYPE GUARD
            </SvgText>
            <Line x1="146" y1="98" x2="146" y2="130" stroke="#FF70A6" strokeWidth="2" />
            <Line x1="290" y1="130" x2="290" y2="98" stroke="#FF70A6" strokeWidth="2" />
          </>
        )}

        {key === 'raft_consensus' && (
          <>
            <Rect x="20" y="68" width="88" height="46" fill="#1F3A52" stroke="#00E5FF" strokeWidth="2" />
            <SvgText x="32" y="95" fill="#00E5FF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              FOLLOWER
            </SvgText>

            <Line x1="108" y1="91" x2="138" y2="91" stroke="#FFB000" strokeWidth="2" />
            <Rect x="138" y="68" width="88" height="46" fill="#3B2318" stroke="#FFB000" strokeWidth="2" />
            <SvgText x="148" y="95" fill="#FFB000" fontSize="11" fontFamily="monospace" fontWeight="bold">
              CANDIDATE
            </SvgText>

            <Line x1="226" y1="91" x2="256" y2="91" stroke="#72F1B8" strokeWidth="2" />
            <Rect x="256" y="68" width="86" height="46" fill="#1B4332" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="274" y="95" fill="#72F1B8" fontSize="11" fontFamily="monospace" fontWeight="bold">
              LEADER
            </SvgText>

            <Rect x="20" y="138" width="322" height="42" fill="#182820" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="32" y="163" fill="#FFD166" fontSize="10" fontFamily="monospace" fontWeight="bold">
              WAL QUORUM LOG: [TERM 4 | IDX 108 | COMMITTED]
            </SvgText>
          </>
        )}

        {key === 'btree_storage' && (
          <>
            {/* Root Node */}
            <Rect x="120" y="42" width="120" height="32" fill="#3B2318" stroke="#FFB000" strokeWidth="2" />
            <SvgText x="135" y="62" fill="#FFB000" fontSize="10" fontFamily="monospace" fontWeight="bold">
              ROOT [K: 50 | 100]
            </SvgText>

            {/* Internal Branches */}
            <Line x1="150" y1="74" x2="70" y2="106" stroke="#FFB000" strokeWidth="2" />
            <Line x1="180" y1="74" x2="180" y2="106" stroke="#FFB000" strokeWidth="2" />
            <Line x1="210" y1="74" x2="290" y2="106" stroke="#FFB000" strokeWidth="2" />

            {/* Leaf Pages */}
            <Rect x="20" y="106" width="92" height="40" fill="#1B4332" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="28" y="130" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              LEAF [10..49]
            </SvgText>

            <Rect x="134" y="106" width="92" height="40" fill="#1B4332" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="142" y="130" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              LEAF [50..99]
            </SvgText>

            <Rect x="248" y="106" width="92" height="40" fill="#1B4332" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="252" y="130" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              LEAF [100..180]
            </SvgText>

            {/* Sibling Pointers */}
            <Line x1="112" y1="126" x2="134" y2="126" stroke="#00E5FF" strokeWidth="2" />
            <Line x1="226" y1="126" x2="248" y2="126" stroke="#00E5FF" strokeWidth="2" />

            <SvgText x="55" y="176" fill="#00E5FF" fontSize="10" fontFamily="monospace">
              SEQUENTIAL LEAF SCAN POINTERS (&lt;--&gt;)
            </SvgText>
          </>
        )}

        {key === 'zk_proof_circuit' && (
          <>
            <Rect x="18" y="60" width="94" height="58" fill="#2A1D32" stroke="#FF70A6" strokeWidth="2" />
            <SvgText x="26" y="84" fill="#FF70A6" fontSize="10" fontFamily="monospace" fontWeight="bold">
              PROVER (P)
            </SvgText>
            <SvgText x="26" y="102" fill="#FFFDF7" fontSize="9" fontFamily="monospace">
              Secret Witness
            </SvgText>

            <Line x1="112" y1="89" x2="144" y2="89" stroke="#FFD166" strokeWidth="2" />
            <Rect x="144" y="54" width="92" height="70" fill="#3B2318" stroke="#FFD166" strokeWidth="2" />
            <SvgText x="152" y="80" fill="#FFD166" fontSize="10" fontFamily="monospace" fontWeight="bold">
              R1CS CIRCUIT
            </SvgText>
            <SvgText x="152" y="98" fill="#72F1B8" fontSize="9" fontFamily="monospace">
              A(x)*B(x)=C(x)
            </SvgText>
            <SvgText x="152" y="114" fill="#00E5FF" fontSize="9" fontFamily="monospace">
              Proof π (288B)
            </SvgText>

            <Line x1="236" y1="89" x2="262" y2="89" stroke="#72F1B8" strokeWidth="2" />
            <Rect x="262" y="60" width="82" height="58" fill="#1B4332" stroke="#72F1B8" strokeWidth="2" />
            <SvgText x="270" y="84" fill="#72F1B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              VERIFIER
            </SvgText>
            <SvgText x="270" y="102" fill="#FFFDF7" fontSize="9" fontFamily="monospace">
              O(1) Accept ✓
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
