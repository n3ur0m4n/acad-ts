import { describe, expect, it } from 'vitest';
import { DxfReader } from '../../../src/IO/DXF/DxfReader.js';
import { Region } from '../../../src/Entities/Region.js';
import { CadBody } from '../../../src/Entities/CadBody.js';
import { ModelerGeometry } from '../../../src/Entities/ModelerGeometry.js';
import { AcisTextCodec } from '../../../src/IO/AcisTextCodec.js';

function readGeometry(name: string, sat: (string | number)[]): ModelerGeometry {
	const pairs: (string | number)[] = [
		0, 'SECTION', 2, 'ENTITIES', 0, name, 5, 'A1',
		100, 'AcDbEntity', 8, '0', 100, 'AcDbModelerGeometry', 70, 1,
		...sat,
		0, 'ENDSEC', 0, 'EOF',
	];
	const document = new DxfReader(new TextEncoder().encode(pairs.join('\n') + '\n')).read();
	return [...document.entities][0] as ModelerGeometry;
}

function readRegion(sat: (string | number)[]): Region {
	return readGeometry('REGION', sat) as Region;
}

const long = `ellipse-curve $-1 ${Array.from({ length: 30 }, (_, i) => `0.${i}123456789`).join(' ')} #`;

describe('DXF modeler geometry SAT lines', () => {
	// AutoCAD / ACadSharp: group 1 starts a line, groups 3 continue it.
	it('joins group 3 chunks to the group 1 line they follow', () => {
		const region = readRegion([1, '400 0 1 0', 1, long.slice(0, 250), 3, long.slice(250), 1, 'vertex $-1 $2 $3 #']);
		expect(region.getAcisText()).toBe(`400 0 1 0\n${long}\nvertex $-1 $2 $3 #`);
	});

	// ODA / BricsCAD: groups 3 hold the first 255-character chunks of a line, the group 1 that follows ends it.
	it('joins group 3 chunks to the group 1 that ends the line', () => {
		const region = readRegion([1, '400 0 1 0', 1, 'vertex $-1 $2 $3 #', 3, long.slice(0, 255), 1, long.slice(255), 1, 'vertex $-1 $4 $5 #']);
		expect(region.getAcisText()).toBe(`400 0 1 0\nvertex $-1 $2 $3 #\n${long}\nvertex $-1 $4 $5 #`);
	});

	// A chunk may end with the space between two fields: it must not be trimmed away.
	it('keeps the spaces at the end of a chunk', () => {
		const cut = long.indexOf(' ', 250) + 1;
		const region = readRegion([1, '400 0 1 0', 3, long.slice(0, cut), 1, long.slice(cut)]);
		expect(region.getAcisText()).toBe(`400 0 1 0\n${long}`);
	});

	// '^ ' is the DXF escape of '^', the encoded 'A' of SAT text.
	it('unescapes carets in chunks', () => {
		const cut = long.indexOf(' ', 250) + 1;
		const line = `${long} @4 ACIS #`;
		const escaped = (s: string) => [...s].map(c => (c === ' ' ? c : String.fromCharCode(159 - c.charCodeAt(0)))).join('').replace(/\^/g, '^ ');
		const region = readRegion([1, escaped('400 0 1 0'), 3, escaped(line.slice(0, cut)), 1, escaped(line.slice(cut))]);
		expect(region.getAcisText()).toBe(`400 0 1 0
${line}`);
	});

	// BricsCAD writes AcDbBody entities as BODY with the same AcDbModelerGeometry groups 1/3 (encoded SAT).
	it('reads the SAT lines of a BODY entity', () => {
		const lines = ['700 0 1 0', 'vertex $-1 $2 $3 #'];
		const encoded = lines.map(l => AcisTextCodec.decode(l)); // the codec (c -> 159 - c) is its own inverse
		const body = readGeometry('BODY', [1, encoded[0], 1, encoded[1]]);
		expect(body).toBeInstanceOf(CadBody);
		expect(body.acisTextEncoded).toBe(true);
		expect(body.getAcisText()).toBe(lines.join('\n'));
	});
});
