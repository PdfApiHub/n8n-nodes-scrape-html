import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { normalizeUrl, checkApiResponse } from '../helpers';

/* ================================================================
 *  Field descriptions – URL → rendered HTML
 * ================================================================ */

export const description: INodeProperties[] = [
	// ─── 1. Source ──────────────────────────────────────────────────
	{
		displayName: 'URL',
		name: 'html_fetch_url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://pdfapihub.com',
		description: 'The webpage to fetch rendered HTML from. https:// is added automatically if omitted. Great for scraping JS-rendered or SPA pages.',
		displayOptions: { show: { operation: ['fetchHtml'] } },
	},

	// ─── 2. Wait Strategy ──────────────────────────────────────────
	{
		displayName: 'Wait Until',
		name: 'html_wait_till',
		type: 'options',
		options: [
			{ name: 'Fully Loaded (Default)', value: 'load', description: 'All resources (images, CSS, fonts) have finished loading' },
			{ name: 'DOM Ready (Fast)', value: 'domcontentloaded', description: 'HTML is parsed — images & styles may still be loading' },
			{ name: 'Network Quiet (Best for SPAs)', value: 'networkidle', description: 'No network activity for 500 ms — ideal for JS-heavy pages' },
			{ name: 'First Response (Fastest)', value: 'commit', description: 'Proceed as soon as the server starts responding' },
		],
		default: 'load',
		description: 'When to consider the page loaded before capturing its HTML',
		displayOptions: { show: { operation: ['fetchHtml'] } },
	},
	{
		displayName: 'Wait for Element (Optional)',
		name: 'html_wait_for_selector',
		type: 'string',
		default: '',
		placeholder: '#main-content',
		description: 'CSS selector to wait for before returning HTML — useful for SPAs that render content after initial load (e.g. "#app .loaded")',
		displayOptions: { show: { operation: ['fetchHtml'] } },
	},
	{
		displayName: 'Extra Delay (Ms)',
		name: 'html_wait_for_timeout',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Additional milliseconds to wait after the page has loaded (and after the element selector resolves, if set). Useful for lazy content or animations. 0 = no extra delay.',
		displayOptions: { show: { operation: ['fetchHtml'] } },
	},

	// ─── 3. Viewport ───────────────────────────────────────────────
	{
		displayName: 'Viewport Size',
		name: 'html_viewport_preset',
		type: 'options',
		options: [
			{ name: 'Custom …', value: 'custom' },
			{ name: 'Desktop (1920 × 1080) (Default)', value: '1920x1080' },
			{ name: 'Laptop (1366 × 768)', value: '1366x768' },
			{ name: 'Large Desktop (2560 × 1440)', value: '2560x1440' },
			{ name: 'Mobile (375 × 812)', value: '375x812' },
			{ name: 'Standard (1280 × 720)', value: '1280x720' },
			{ name: 'Tablet (768 × 1024)', value: '768x1024' },
		],
		default: '1920x1080',
		description: 'Browser viewport size used during rendering — affects responsive layout and what HTML the page returns',
		displayOptions: { show: { operation: ['fetchHtml'] } },
	},
	{
		displayName: 'Viewport Width (Px)',
		name: 'html_viewport_width',
		type: 'number',
		default: 1920,
		typeOptions: { minValue: 1 },
		description: 'Custom viewport width in pixels',
		displayOptions: { show: { operation: ['fetchHtml'], html_viewport_preset: ['custom'] } },
	},
	{
		displayName: 'Viewport Height (Px)',
		name: 'html_viewport_height',
		type: 'number',
		default: 1080,
		typeOptions: { minValue: 1 },
		description: 'Custom viewport height in pixels',
		displayOptions: { show: { operation: ['fetchHtml'], html_viewport_preset: ['custom'] } },
	},

	// ─── 4. Advanced Options ────────────────────────────────────────
	{
		displayName: 'Advanced Options',
		name: 'htmlAdvancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { operation: ['fetchHtml'] } },
		options: [
			{
				displayName: 'Navigation Timeout (Ms)',
				name: 'timeout',
				type: 'number',
				default: 30000,
				typeOptions: { minValue: 1000 },
				description: 'Maximum milliseconds the browser will wait for the page to reach the "Wait Until" condition before giving up. Default is 30 000 ms (30 seconds).',
			},
			{
				displayName: 'User Agent',
				name: 'user_agent',
				type: 'string',
				default: '',
				placeholder: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
				description: 'Custom User-Agent string — useful for fetching mobile or bot-specific versions of a page',
			},
			{
				displayName: 'Extra HTTP Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description: 'Additional HTTP headers sent with every request made by the browser',
				options: [
					{
						name: 'header',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'Accept-Language',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'en-US',
							},
						],
					},
				],
			},
		],
	},
];

/* ================================================================
 *  Execute handler
 * ================================================================ */

export async function execute(
	this: IExecuteFunctions,
	index: number,
	returnData: INodeExecutionData[],
): Promise<void> {
	const url = normalizeUrl(this.getNodeParameter('html_fetch_url', index) as string);
	const waitTill = this.getNodeParameter('html_wait_till', index, 'load') as string;
	const waitForSelector = this.getNodeParameter('html_wait_for_selector', index, '') as string;
	const waitForTimeout = this.getNodeParameter('html_wait_for_timeout', index, 0) as number;

	// ── Viewport ────────────────────────────────────────────────────
	const viewportPreset = this.getNodeParameter('html_viewport_preset', index, '1920x1080') as string;
	const [presetW, presetH] = viewportPreset === 'custom'
		? [1920, 1080]
		: viewportPreset.split('x').map(Number);
	const viewportWidth = this.getNodeParameter('html_viewport_width', index, presetW) as number;
	const viewportHeight = this.getNodeParameter('html_viewport_height', index, presetH) as number;

	// ── Advanced options ────────────────────────────────────────────
	const advanced = this.getNodeParameter('htmlAdvancedOptions', index, {}) as Record<string, unknown>;

	// Backward compat: old workflows stored timeout / user_agent as top-level params.
	let timeout = advanced.timeout as number | undefined;
	if (timeout === undefined) {
		try {
			timeout = this.getNodeParameter('html_timeout', index) as number;
		} catch {
			timeout = 30000;
		}
	}

	let userAgent = advanced.user_agent as string | undefined;
	if (userAgent === undefined) {
		try {
			userAgent = this.getNodeParameter('html_user_agent', index) as string;
		} catch {
			userAgent = '';
		}
	}

	// Build headers from fixedCollection
	const headersCollection = advanced.headers as { header?: Array<{ name?: string; value?: string }> } | undefined;
	const headers: Record<string, string> = {};
	if (headersCollection?.header?.length) {
		for (const h of headersCollection.header) {
			if (h.name) headers[h.name] = h.value ?? '';
		}
	}

	// ── Build request body ──────────────────────────────────────────
	const body: Record<string, unknown> = {
		url,
		wait_till: waitTill,
		timeout,
		viewport_width: viewportWidth,
		viewport_height: viewportHeight,
	};
	if (waitForSelector) body.wait_for_selector = waitForSelector;
	if (waitForTimeout > 0) body.wait_for_timeout = waitForTimeout;
	if (userAgent) body.user_agent = userAgent;
	if (Object.keys(headers).length) body.headers = headers;

	// ── API call ────────────────────────────────────────────────────
	const responseData = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'pdfapihubApi',
		{
			method: 'POST',
			url: 'https://pdfapihub.com/api/v1/url-to-html',
			body,
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
			timeout: timeout + 15000,
		},
	) as { body: Record<string, unknown>; statusCode: number };

	checkApiResponse(this, responseData.statusCode, responseData.body, index);
	returnData.push({ json: responseData.body as import('n8n-workflow').IDataObject, pairedItem: { item: index } });
}
