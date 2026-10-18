import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { readFileAsArrayBuffer } from '../../testHelpers.js';
import { TestVariables } from '../../TestVariables.js';
import { DwgReader } from '../../../src/IO/DWG/DwgReader.js';
import { DwgReaderConfiguration } from '../../../src/IO/DWG/DwgReaderConfiguration.js';
import { ModelerGeometry } from '../../../src/Entities/ModelerGeometry.js';
import { Region } from '../../../src/Entities/Region.js';
import { NotificationType } from '../../../src/IO/NotificationEventHandler.js';

function readModelers(version: string) {
	// Failsafe stays on: unrelated objects (e.g. ACAD_TABLE in AC1021) may still fail; only modeler errors matter here.
	const errors: string[] = [];
	const data = readFileAsArrayBuffer(path.join(TestVariables.samplesFolder, `sample_${version}.dwg`));
	const doc = DwgReader.readFromStreamWithConfig(data, new DwgReaderConfiguration(), (_sender, e) => {
		if (e.notificationType === NotificationType.Error && /Prototype1b|3DSOLID|REGION|BODY|wire/i.test(e.message)) {
			errors.push(e.message);
		}
	});
	const modelers: ModelerGeometry[] = [];
	for (const record of doc.blockRecords) {
		for (const entity of record.entities) {
			if (entity instanceof ModelerGeometry) modelers.push(entity);
		}
	}
	return { modelers, errors };
}

describe('DWG modeler geometry (3DSOLID / REGION / BODY)', () => {
	// The samples contain the same 2 3DSOLID + 1 REGION in every version.
	it.each(['AC1018', 'AC1021', 'AC1024', 'AC1027', 'AC1032'])('%s reads every modeler entity with its ACIS data', version => {
		const { modelers, errors } = readModelers(version);
		expect(errors).toEqual([]);
		expect(modelers.map(m => m.constructor.name).sort()).toEqual(['Region', 'Solid3D', 'Solid3D']);
		for (const modeler of modelers) {
			expect(modeler.acisData.length).toBeGreaterThan(0);
		}
	});

	it.each(['ACIS BinaryFile', 'ASM BinaryFile4'])('recognizes %s as binary ACIS data', signature => {
		const region = new Region();
		region.acisData = new TextEncoder().encode(`${signature}\x00\x01\x02`);
		expect(region.isBinaryAcisData).toBe(true);
		expect(region.getAcisText()).toBeNull();
	});

	it('does not treat SAT text as binary ACIS data', () => {
		const region = new Region();
		region.acisData = new TextEncoder().encode('21500 0 1 0\n');
		expect(region.isBinaryAcisData).toBe(false);
	});
});
