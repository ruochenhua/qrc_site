import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, COMPONENT_CATEGORIES, STARTING_COMPONENTS } from '../js/config.js';

describe('New quantity-based component model', () => {
  test('COMPONENTS has five categories', () => {
    assert.deepEqual(COMPONENT_CATEGORIES.sort(), ['casing', 'colorant', 'effect', 'fuse', 'gunpowder']);
  });

  test('every component has required base fields', () => {
    for (const category of COMPONENT_CATEGORIES) {
      for (const comp of Object.values(COMPONENTS[category])) {
        assert.equal(typeof comp.id, 'string', `${comp.id} missing id`);
        assert.equal(typeof comp.name, 'string', `${comp.id} missing name`);
        assert.equal(typeof comp.desc, 'string', `${comp.id} missing desc`);
        assert.ok(comp.desc.length > 0, `${comp.id} desc empty`);
        assert.equal(typeof comp.cost, 'number', `${comp.id} missing cost`);
        assert.ok(comp.cost >= 0, `${comp.id} cost negative`);
        assert.equal(typeof comp.unlockFame, 'number', `${comp.id} missing unlockFame`);
        assert.ok(comp.unlockFame >= 0, `${comp.id} unlockFame negative`);
      }
    }
  });

  test('gunpowder components have thrust', () => {
    for (const comp of Object.values(COMPONENTS.gunpowder)) {
      assert.equal(typeof comp.thrust, 'number', `${comp.id} missing thrust`);
      assert.ok(comp.thrust > 0, `${comp.id} thrust non-positive`);
    }
  });

  test('casing components have shape, capacity, layers, scaleMultiplier', () => {
    for (const comp of Object.values(COMPONENTS.casing)) {
      assert.equal(typeof comp.shape, 'string', `${comp.id} missing shape`);
      assert.equal(typeof comp.capacity, 'number', `${comp.id} missing capacity`);
      assert.ok(comp.capacity > 0, `${comp.id} capacity non-positive`);
      assert.equal(typeof comp.layers, 'number', `${comp.id} missing layers`);
      assert.ok(comp.layers >= 1, `${comp.id} layers < 1`);
      assert.equal(typeof comp.scaleMultiplier, 'number', `${comp.id} missing scaleMultiplier`);
      assert.ok(comp.scaleMultiplier > 0, `${comp.id} scaleMultiplier non-positive`);
      if (comp.layers >= 2) {
        assert.equal(typeof comp.secondaryCapacity, 'number', `${comp.id} missing secondaryCapacity`);
        assert.ok(comp.secondaryCapacity > 0, `${comp.id} secondaryCapacity non-positive`);
      }
    }
  });

  test('colorant components have color and density', () => {
    for (const comp of Object.values(COMPONENTS.colorant)) {
      assert.equal(typeof comp.color, 'string', `${comp.id} missing color`);
      assert.equal(typeof comp.density, 'number', `${comp.id} missing density`);
      assert.ok(comp.density > 0, `${comp.id} density non-positive`);
    }
  });

  test('fuse components have length and heightFactor', () => {
    for (const comp of Object.values(COMPONENTS.fuse)) {
      assert.equal(typeof comp.length, 'string', `${comp.id} missing length`);
      assert.equal(typeof comp.heightFactor, 'number', `${comp.id} missing heightFactor`);
      assert.ok(comp.heightFactor > 0, `${comp.id} heightFactor non-positive`);
    }
  });

  test('effect components have effect, threshold, intensity', () => {
    for (const comp of Object.values(COMPONENTS.effect)) {
      assert.equal(typeof comp.effect, 'string', `${comp.id} missing effect`);
      assert.equal(typeof comp.threshold, 'number', `${comp.id} missing threshold`);
      assert.ok(comp.threshold > 0, `${comp.id} threshold non-positive`);
      assert.equal(typeof comp.intensity, 'number', `${comp.id} missing intensity`);
      assert.ok(comp.intensity > 0, `${comp.id} intensity non-positive`);
    }
  });

  test('starting components exist in COMPONENTS', () => {
    for (const id of STARTING_COMPONENTS) {
      let found = false;
      for (const category of COMPONENT_CATEGORIES) {
        if (COMPONENTS[category][id]) found = true;
      }
      assert.ok(found, `starting component ${id} not found`);
    }
  });
});
