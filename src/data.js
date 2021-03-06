'use strict';

import {quantile, extent} from 'd3-array';
import kde from 'science/src/stats/kde';

export function whiskers(boxplot) {
	const iqr = boxplot.q3 - boxplot.q1;
	// since top left is max
	const whiskerMin = Math.max(boxplot.min, boxplot.q1 - iqr);
	const whiskerMax = Math.min(boxplot.max, boxplot.q3 + iqr);
	return {whiskerMin, whiskerMax};
}

export function boxplotStats(arr) {
	// console.assert(Array.isArray(arr));
	if (arr.length === 0) {
		return {
			min: NaN,
			max: NaN,
			median: NaN,
			q1: NaN,
			q3: NaN,
			whiskerMin: NaN,
			whiskerMax: NaN,
			outliers: []
		};
	}
	arr = arr.filter((v) => typeof v === 'number' && !isNaN(v));
	arr.sort((a, b) => a - b);

	const minmax = extent(arr);
	const base = {
		min: minmax[0],
		max: minmax[1],
		median: quantile(arr, 0.5),
		q1: quantile(arr, 0.25),
		q3: quantile(arr, 0.75),
		outliers: []
	};
	const {whiskerMin, whiskerMax} = whiskers(base);
	base.outliers = arr.filter((v) => v < whiskerMin || v > whiskerMax);
	base.whiskerMin = whiskerMin;
	base.whiskerMax = whiskerMax;
	return base;
}

export function violinStats(arr) {
	// console.assert(Array.isArray(arr));
	if (arr.length === 0) {
		return {
			outliers: []
		};
	}
	arr = arr.filter((v) => typeof v === 'number' && !isNaN(v));
	arr.sort((a, b) => a - b);

	const minmax = extent(arr);
	return {
		min: minmax[0],
		max: minmax[1],
		median: quantile(arr, 0.5),
		kde: kde().sample(arr)
	};
}

export function asBoxPlotStats(value) {
	if (!value) {
		return null;
	}
	if (typeof value.median === 'number' && typeof value.q1 === 'number' && typeof value.q3 === 'number') {
		// sounds good, check for helper
		if (typeof value.whiskerMin === 'undefined') {
			const {whiskerMin, whiskerMax} = whiskers(value);
			value.whiskerMin = whiskerMin;
			value.whiskerMax = whiskerMax;
		}
		return value;
	}
	if (!Array.isArray(value)) {
		return undefined;
	}
	if (value.__stats === undefined) {
		value.__stats = boxplotStats(value);
	}
	return value.__stats;
}

export function asViolinStats(value) {
	if (!value) {
		return null;
	}
	if (typeof value.median === 'number' && (typeof value.kde === 'function' || Array.isArray(value.coords))) {
		return value;
	}
	if (!Array.isArray(value)) {
		return undefined;
	}
	if (value.__kde === undefined) {
		value.__kde = violinStats(value);
	}
	return value.__kde;
}

export function asMinMaxStats(value) {
	if (typeof value.min === 'number' && typeof value.max === 'number') {
		return value;
	}
	if (!Array.isArray(value)) {
		return undefined;
	}
	return asBoxPlotStats(value);
}

export function getRightValue(rawValue) {
	if (!rawValue) {
		return rawValue;
	}
	if (typeof rawValue === 'number' || typeof rawValue === 'string') {
		return Number(rawValue);
	}
	const b = asBoxPlotStats(rawValue);
	return b ? b.median : rawValue;
}

export function commonDataLimits(extraCallback) {
	const chart = this.chart;
	const isHorizontal = this.isHorizontal();

	const matchID = (meta) => isHorizontal ? meta.xAxisID === this.id : meta.yAxisID === this.id;

	// First Calculate the range
	this.min = null;
	this.max = null;

	// Regular charts use x, y values
	// For the boxplot chart we have rawValue.min and rawValue.max for each point
	chart.data.datasets.forEach((d, i) => {
		const meta = chart.getDatasetMeta(i);
		if (!chart.isDatasetVisible(i) || !matchID(meta)) {
			return;
		}
		d.data.forEach((value, j) => {
			if (!value || meta.data[j].hidden) {
				return;
			}
			const minmax = asMinMaxStats(value);
			if (!minmax) {
				return;
			}
			if (this.min === null) {
				this.min = minmax.min;
			} else if (minmax.min < this.min) {
				this.min = minmax.min;
			}

			if (this.max === null) {
				this.max = minmax.max;
			} else if (minmax.max > this.max) {
				this.max = minmax.max;
			}

			if (extraCallback) {
				extraCallback(minmax);
			}
		});
	});
}

export function rnd(seed) {
	// Adapted from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
	if (seed === undefined) {
		seed = Date.now();
	}
	return () => {
		seed = (seed * 9301 + 49297) % 233280;
		return seed / 233280;
	};
}
