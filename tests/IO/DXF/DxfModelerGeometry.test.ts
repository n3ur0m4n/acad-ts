import { describe, expect, it } from 'vitest';
import { DxfReader } from '../../../src/IO/DXF/DxfReader.js';
import { Region } from '../../../src/Entities/Region.js';

function readRegion(sat: (string | number)[]): Region {
	const pairs: (string | number)[] = [
		0, 'SECTION', 2, 'ENTITIES', 0, 'REGION', 5, 'A1',
		100, 'AcDbEntity', 8, '0', 100, 'AcDbModelerGeometry', 70, 1,
		...sat,
		0, 'ENDSEC', 0, 'EOF',
	];
	const document = new DxfReader(new TextEncoder().encode(pairs.join('\n') + '\n')).read();
	return [...document.entities][0] as Region;
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
});
