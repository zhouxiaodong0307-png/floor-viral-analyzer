/* V7 fixed collector entry
 * Single entry point. Future collector updates should modify this file instead of creating v64/v65 files.
 */
(() => {
  window.FloorViralCollector = {
    version: "7.0.0",
    target: 500,
    classify(item, keyword = "") {
      const text = `${item.title || ''} ${item.text || ''}`;
      if (keyword && text.includes(keyword)) return 'A';
      if (/地板|实木|木种|橡木|柚木|红檀香|菠萝格|龙凤檀/.test(text)) return 'B';
      return 'C';
    },
    normalize(result = {}) {
      return {
        target: 500,
        rawCount: result.rawCount || 0,
        validCount: result.validCount || result.items?.length || 0,
        directCount: result.directCount || 0,
        relatedCount: result.relatedCount || 0,
        marketCount: result.marketCount || 0,
        items: result.items || []
      };
    }
  };
})();
