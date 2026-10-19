import { describe, it, expect } from 'vitest';
import { Color } from '../src/Color.js';

describe('ColorTests', () => {
  it('IndexedColorProperties', () => {
    expect(new Color(0).isByBlock).toBe(true);
    expect(new Color(256).isByLayer).toBe(true);

    expect(Color.fromTrueColor(2705).isTrueColor).toBe(true);
    expect(Color.fromTrueColor(2706).isTrueColor).toBe(true);
    expect(Color.fromTrueColor(2707).isTrueColor).toBe(true);
    expect(Color.fromTrueColor(2708).isTrueColor).toBe(true);
  });

  it('ParsesTrueColors', () => {
    const rgbValues = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [18, 52, 86],
    ];

    for (const [r, g, b] of rgbValues) {
      const intColor = (r << 16) | (g << 8) | b;
      const color = new Color(r, g, b);

      expect(color.isTrueColor).toBe(true);
      expect(color.trueColor).toBe(intColor);
      expect(color.index).toBe(-1);

      const rgb = color.getTrueColorRgb();
      expect(rgb[0]).toBe(r);
      expect(rgb[1]).toBe(g);
      expect(rgb[2]).toBe(b);
    }
  });

  it('ParsesTrueColorIntegersAsRgb', () => {
    const color = Color.fromTrueColor(0x123456);

    expect(color.r).toBe(0x12);
    expect(color.g).toBe(0x34);
    expect(color.b).toBe(0x56);
  });

  it('Handles000TrueColor', () => {
    const color = new Color(0, 0, 0);

    expect(color.isTrueColor).toBe(true);
    expect(color.trueColor).toBe(0);
  });

  it('HandlesIndexedColors', () => {
    for (let i = 0; i <= 256; i++) {
      const color = new Color(i);
      expect(color.isTrueColor).toBe(false);
      expect(color.index).toBe(i);
      expect(color.trueColor).toBe(-1);

      const rgb = color.getTrueColorRgb();
      expect(rgb[0]).toBe(0);
      expect(rgb[1]).toBe(0);
      expect(rgb[2]).toBe(0);
    }
  });

  it('GetRgbTest', () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    const color = new Color(r, g, b);
    const rgb = color.getRgb();

    expect(rgb[0]).toBe(r);
    expect(rgb[1]).toBe(g);
    expect(rgb[2]).toBe(b);
  });

  it('ByLayerTest', () => {
    const byLayer = Color.byLayer;

    expect(byLayer.isByLayer).toBe(true);
    expect(byLayer.isByBlock).toBe(false);
    expect(byLayer.index).toBe(256);
  });

  it('ByBlockTest', () => {
    const byBlock = Color.byBlock;

    expect(byBlock.isByBlock).toBe(true);
    expect(byBlock.isByLayer).toBe(false);
    expect(byBlock.index).toBe(0);
  });

  it('IndexRgbMatchesTheAutoCadPalette', () => {
    // Entries that differed from the AutoCAD 2020 model space palette (ezdxf DXF_DEFAULT_COLORS): 192 is violet as
    // in AutoCAD and BricsCAD, not crimson.
    const palette: [number, number[]][] = [
      [29, [38, 23, 19]],
      [91, [127, 255, 127]],
      [145, [63, 111, 127]],
      [192, [82, 0, 165]],
      [203, [145, 82, 165]],
    ];
    for (const [index, rgb] of palette) {
      expect(Color.getIndexRGB(index), `index ${index}`).toEqual(rgb);
    }
  });
});
