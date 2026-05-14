const fs = require('fs');
const p = 'D:/costco/costco-app/src/components/pages/AutoAlloc/AutoAlloc.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix 1: restore corrupted border template literal
c = c.replace('border: px solid  }}', 'border: `1px solid ${DT_TEXT[lt.dayType]}30` }}');

// Fix 2: add missing </div> closing tableWrap before legend
c = c.replace(
  '        </table>\n      <div className={styles.legend}>',
  '        </table>\n      </div>\n      <div className={styles.legend}>'
);

// Fix 3: remove extra </div> after legend closing tag
c = c.replace(
  '      </div>\n      </div>\n      {/* Picker dropdown */}',
  '      </div>\n      {/* Picker dropdown */}'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Done');
