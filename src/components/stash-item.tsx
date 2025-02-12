import DOMPurify from 'isomorphic-dompurify';

export function StashItem({ item }: { item: StashItem }) {
  return (
    <div className="stash-item">
      <h2>{item.title}</h2>
      {item.scraped_content ? (
        <div 
          className="content prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(item.scraped_content) 
          }} 
        />
      ) : (
        <p>{item.summary}</p>
      )}
    </div>
  );
} 