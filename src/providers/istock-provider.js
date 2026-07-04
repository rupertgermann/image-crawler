import GettyImagesProvider from './gettyimages-provider.js';

class IStockProvider extends GettyImagesProvider {
  constructor(providerConfig, emitter) {
    // Pass the iStock config (which should include the Getty API key) 
    // and emitter to the GettyImagesProvider constructor.
    super(providerConfig, emitter); 
    this.name = 'IStock';
    // Leverages GettyImagesProvider due to unified API. 
    // Specific iStock parameters/filters can be added if identified by overriding fetchImageUrls.
    // For example, the Getty API might have a parameter to filter by collection or brand (e.g., iStock).
    // If such a parameter is found, fetchImageUrls could be overridden to add it to the API call.
  }

  // For now, we assume fetchImageUrls and getFullSizeImage from GettyImagesProvider are sufficient.
  // If specific behavior for iStock is needed (e.g., different API parameters or result processing),
  // those methods would be overridden here.
  
  // Example of how one might override fetchImageUrls if iStock required a specific filter:
  /*
  async fetchImageUrls(query, options, page) {
    this.emitLog('info', `Fetching images for iStock (using Getty API) for query: "${query}"`);
    
    // Modify options or API parameters specific to iStock
    const iqueryParams = {
      ...options,
      // Example: if Getty API had a parameter 'collection_filter_id' for iStock
      // 'collection_filter_id': 'istock_collection_id_value', 
    };
    
    // Call the parent (GettyImagesProvider) method with potentially modified options/params
    return super.fetchImageUrls(query, iqueryParams, page);
  }
  */
}

export default IStockProvider;
