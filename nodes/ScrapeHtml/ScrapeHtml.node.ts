import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { description, execute } from './actions/fetchHtml';

export class ScrapeHtml implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scrape Website HTML',
		name: 'scrapeHtml',
		icon: { light: 'file:../../icons/icon.svg', dark: 'file:../../icons/icon.svg' },
		group: ['transform'],
		version: 1,
		description: 'Fetch fully-rendered HTML from any webpage including SPAs using PDF API Hub',
		defaults: { name: 'Scrape Website HTML' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'pdfapihubApi', required: true }],
		usableAsTool: true,
		properties: description.map(p => {
			// Remove displayOptions.show.operation since this is a single-operation node
			const { displayOptions, ...rest } = p;
			if (displayOptions?.show?.operation) {
				const { operation, ...otherShow } = displayOptions.show;
				const newDisplayOptions = Object.keys(otherShow).length > 0
					? { ...displayOptions, show: otherShow }
					: displayOptions.hide ? { hide: displayOptions.hide } : undefined;
				if (displayOptions.hide && Object.keys(otherShow).length > 0) {
					return { ...rest, displayOptions: { show: otherShow, hide: displayOptions.hide } };
				}
				return newDisplayOptions ? { ...rest, displayOptions: newDisplayOptions } : rest;
			}
			return p;
		}),
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				await (execute as Function).call(this, i, returnData, 'fetchHtml');
			} catch (error) {
				if (this.continueOnFail()) {
					const message = error instanceof Error ? error.message : 'Unknown error';
					returnData.push({ json: { error: message }, pairedItem: { item: i } });
				} else if (error instanceof NodeApiError) {
					throw error;
				} else {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
			}
		}
		return [returnData];
	}
}
