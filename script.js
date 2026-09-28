const STORAGE_KEY="swiftSlipV2";
const currencyMeta={
 NGN:{symbol:"₦",name:"Naira",minor:"Kobo",locale:"en-NG"},
 USD:{symbol:"$",name:"Dollars",minor:"Cents",locale:"en-US"},
 GBP:{symbol:"£",name:"Pounds",minor:"Pence",locale:"en-GB"},
 EUR:{symbol:"€",name:"Euros",minor:"Cents",locale:"en-IE"},
 CAD:{symbol:"$",name:"Canadian Dollars",minor:"Cents",locale:"en-CA"},
 AUD:{symbol:"$",name:"Australian Dollars",minor:"Cents",locale:"en-AU"},
 GHS:{symbol:"₵",name:"Ghanaian Cedis",minor:"Pesewas",locale:"en-GH"},
 KES:{symbol:"KSh",name:"Kenyan Shillings",minor:"Cents",locale:"en-KE"}
};
const defaultBusiness={name:"",phone:"",email:"",address:"",tin:"",reg:"",currency:"NGN",logo:"",signature:""};
const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
const state=saved||{activeScreen:"home",editorType:"receipt",docTab:"receipt",counters:{receipt:1,invoice:1,quote:1},documents:[],customers:[],business:{...defaultBusiness},stock:[{name:"AGO (Diesel)",unit:"Litres",quantity:0,max:1000},{name:"Fuel",unit:"Litres",quantity:0,max:1000}],items:[]};
state.business={...defaultBusiness,...(state.business||{})};
state.counters={receipt:1,invoice:1,quote:1,...(state.counters||{})};
state.documents=state.documents||[];state.customers=state.customers||[];
const $=id=>document.getElementById(id);
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function meta(){return currencyMeta[state.business.currency]||currencyMeta.NGN}
function money(n){return new Intl.NumberFormat(meta().locale,{style:"currency",currency:state.business.currency,minimumFractionDigits:2}).format(Number(n)||0)}
function numberWords(n){
 n=Math.floor(Math.abs(Number(n)||0));
 const ones=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
 const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
 function under1000(x){let s="";if(x>=100){s+=ones[Math.floor(x/100)]+" Hundred";x%=100;if(x)s+=" ";}if(x>=20){s+=tens[Math.floor(x/10)];if(x%10)s+="-"+ones[x%10];}else if(x>0)s+=ones[x];return s}
 if(n===0)return "Zero";
 const scales=["","Thousand","Million","Billion","Trillion"];
 let parts=[],i=0;
 while(n>0){const chunk=n%1000;if(chunk)parts.unshift(under1000(chunk)+(scales[i]?" "+scales[i]:""));n=Math.floor(n/1000);i++}
 return parts.join(" ");
}
function amountInWords(amount){
 const value=Math.max(0,Number(amount)||0), whole=Math.floor(value+1e-9), minor=Math.round((value-whole)*100);
 let s=numberWords(whole)+" "+meta().name;
 if(minor>0)s+=" and "+numberWords(minor)+" "+meta().minor;
 return s+" Only";
}
function showScreen(name){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));const screen=$(name+"Screen");if(screen)screen.classList.add("active");document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.screen===name));state.activeScreen=name;const titles={home:["Good morning.","Pick what you need below."],documents:["Your documents","Keep receipts, invoices and quotes in one place."],customers:["Customers","Save customer details so you don't have to type them every time."],stock:["Stock","Keep a simple view of what you sell and what is left."],settings:["Settings","Set up your business once. Swift Slip uses it on your documents."]};if(titles[name]){$("pageTitle").textContent=titles[name][0];$("pageSubtitle").textContent=titles[name][1]}window.scrollTo({top:0,behavior:"smooth"});persist()}
function nextNumber(type){const prefix=type==="receipt"?"RCT":type==="invoice"?"INV":"QUO";return prefix+"-"+String(state.counters[type]++).padStart(4,"0")}
function fillBusinessFields(){
 const b=state.business;
 ["businessName","businessPhone","businessEmail","businessAddress","businessTin","businessReg"].forEach((id,i)=>{if($(id))$(id).value=[b.name,b.phone,b.email,b.address,b.tin,b.reg][i]||""});
 if($("settingsBusinessName")){$("settingsBusinessName").value=b.name||"";$("settingsBusinessPhone").value=b.phone||"";$("settingsBusinessEmail").value=b.email||"";$("settingsBusinessAddress").value=b.address||"";$("settingsBusinessTin").value=b.tin||"";$("settingsBusinessReg").value=b.reg||"";$("settingsCurrency").value=b.currency||"NGN"}
}
function openEditor(type){
 state.editorType=type;state.items=[{name:"",qty:1,price:""}];$("editorLabel").textContent=type[0].toUpperCase()+type.slice(1);$("saveType").textContent=type;$("documentNumber").value=nextNumber(type);
 $("customerLabel").firstChild.textContent=type==="receipt"?"Received from":type==="invoice"?"Bill to":"Prepared for";
 document.querySelectorAll("[data-editor-type]").forEach(b=>b.classList.toggle("active",b.dataset.editorType===type));
 fillBusinessFields();applyCurrencyUI();renderItems();showEditorScreen()
}
function showEditorScreen(){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$("editorScreen").classList.add("active");document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));$("pageTitle").textContent="Create document";$("pageSubtitle").textContent="Your saved business details are already applied.";window.scrollTo({top:0,behavior:"smooth"})}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderItems(){$("items").innerHTML=state.items.map((item,i)=>'<div class="item-row"><input data-item="name" data-index="'+i+'" value="'+escapeHtml(item.name)+'" placeholder="Item or service"><input data-item="qty" data-index="'+i+'" value="'+escapeHtml(item.qty)+'" inputmode="decimal" placeholder="Qty"><input data-item="price" data-index="'+i+'" value="'+escapeHtml(item.price)+'" inputmode="decimal" placeholder="Unit price"><button class="remove-item" data-remove="'+i+'" aria-label="Remove item">×</button></div>').join("");calculateTotal()}
function calculateTotal(){const subtotal=state.items.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||1),0),discount=Number($("discount")?.value)||0,tax=Number($("tax")?.value)||0,total=Math.max(0,subtotal-discount+tax);if($("subtotal"))$("subtotal").textContent=money(subtotal);if($("total"))$("total").textContent=money(total);if($("discountCurrency"))$("discountCurrency").textContent=meta().symbol;if($("taxCurrency"))$("taxCurrency").textContent=meta().symbol;if($("amountWords"))$("amountWords").textContent=amountInWords(total);return{subtotal,discount,tax,total}}
function applyCurrencyUI(){const m=meta();if($("subtotal"))$("subtotal").textContent=money(0);if($("total"))$("total").textContent=money(0);if($("discountCurrency"))$("discountCurrency").textContent=m.symbol;if($("taxCurrency"))$("taxCurrency").textContent=m.symbol;if($("amountWords"))$("amountWords").textContent=amountInWords(0)}
function saveBusinessProfile(){
 const b=state.business;
 b.name=$("settingsBusinessName").value.trim();b.phone=$("settingsBusinessPhone").value.trim();b.email=$("settingsBusinessEmail").value.trim();b.address=$("settingsBusinessAddress").value.trim();b.tin=$("settingsBusinessTin").value.trim();b.reg=$("settingsBusinessReg").value.trim();b.currency=$("settingsCurrency").value;
 const logo=$("settingsBusinessLogo"),sig=$("settingsBusinessSignature");
 const read=(input,key)=>new Promise(resolve=>{if(!input.files?.[0])return resolve();const reader=new FileReader();reader.onload=()=>{b[key]=reader.result;resolve()};reader.readAsDataURL(input.files[0])});
 Promise.all([read(logo,"logo"),read(sig,"signature")]).then(()=>{persist();fillBusinessFields();toast("Business profile saved. It will be reused automatically.")})
}
function saveDocument(){
 const customer=$("customerNameQuick").value.trim(),totals=calculateTotal();
 if(!customer){toast("Add the customer name first.");$("customerNameQuick").focus();return}
 if(!state.items.some(i=>i.name.trim()&&Number(i.price)>0)){toast("Add at least one item and amount.");return}
 const customerObj={name:customer,phone:$("customerPhone").value.trim(),email:$("customerEmail").value.trim(),address:$("customerAddress").value.trim(),tin:$("customerTin").value.trim()};
 if(customerObj.name&&!state.customers.some(c=>c.name.toLowerCase()===customerObj.name.toLowerCase()))state.customers.unshift(customerObj);
 const doc={id:String(Date.now()),type:state.editorType,number:$("documentNumber").value,customer:customerObj,currency:state.business.currency,items:JSON.parse(JSON.stringify(state.items)),...totals,poNumber:$("poNumber").value.trim(),reference:$("referenceNumber").value.trim(),dueDate:$("dueDate").value,paymentTerms:$("paymentTerms").value.trim(),paymentMethod:$("paymentMethod").value,paymentStatus:$("paymentStatus").value,notes:$("notes").value.trim(),createdAt:new Date().toISOString()};
 state.documents.unshift(doc);persist();renderDocuments();renderCustomers();toast(state.editorType[0].toUpperCase()+state.editorType.slice(1)+" saved.");showScreen("documents")
}
function renderDocuments(){
 const filtered=state.documents.filter(d=>d.type===state.docTab);
 $("documentsList").innerHTML=filtered.length?filtered.map(d=>'<div class="document-row"><div><strong>'+escapeHtml(d.number)+'</strong><small>'+escapeHtml(d.customer?.name||d.customer||"Customer")+' · '+new Date(d.createdAt).toLocaleDateString()+"</small></div><span class="document-total">'+formatSavedMoney(d.total,d.currency)+'</span></div>').join(""):'<div class="empty-state">No '+state.docTab+'s yet.</div>';
 const recent=state.documents.slice(0,4);$("recentList").innerHTML=recent.length?recent.map(d=>'<div class="document-row"><div><strong>'+escapeHtml(d.number)+'</strong><small>'+escapeHtml(d.customer?.name||d.customer||"Customer")+'</small></div><span class="document-total">'+formatSavedMoney(d.total,d.currency)+'</span></div>').join(""):'<div class="empty-state">No documents yet. Your latest slips will appear here.</div>'
}
function formatSavedMoney(n,c){const m=currencyMeta[c]||currencyMeta.NGN;return new Intl.NumberFormat(m.locale,{style:"currency",currency:c||"NGN",minimumFractionDigits:2}).format(Number(n)||0)}
function renderCustomers(){$("customerList").innerHTML=state.customers.length?state.customers.map((c,i)=>'<div class="customer-row"><span><strong>'+escapeHtml(c.name||c)+'</strong>'+(c.phone?'<small>'+escapeHtml(c.phone)+'</small>':"")+'</span><button class="text-button" data-delete-customer="'+i+'">Remove</button></div>').join(""):'<div class="empty-state">No customers saved yet.</div>'}
function renderStock(){$("stockList").innerHTML=state.stock.map(p=>{const percent=Math.min(100,p.quantity/p.max*100);return '<div class="stock-card"><div class="stock-top"><div><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.unit)+'</p></div><div class="stock-value">'+p.quantity+'</div></div><div class="stock-bar"><span style="width:'+percent+'%"></span></div></div>'}).join("")}
function toast(message){$("toast").textContent=message;$("toast").classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2400)}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-screen]");if(nav)showScreen(nav.dataset.screen);
 const create=e.target.closest("[data-create]");if(create)openEditor(create.dataset.create);
 const docTab=e.target.closest("[data-doc-tab]");if(docTab){state.docTab=docTab.dataset.docTab;document.querySelectorAll("[data-doc-tab]").forEach(b=>b.classList.toggle("active",b===docTab));renderDocuments();persist()}
 const editorType=e.target.closest("[data-editor-type]");if(editorType&&editorType.dataset.editorType!==state.editorType)openEditor(editorType.dataset.editorType);
 ["businessToggle","customerToggle","documentDetailsToggle"].forEach(id=>{if(e.target.closest("#"+id)){const map={businessToggle:"businessDetails",customerToggle:"customerDetails",documentDetailsToggle:"documentDetails"};const body=$(map[id]);const open=body.classList.toggle("open");$(id).setAttribute("aria-expanded",String(open))}});
 if(e.target.closest("#addItem")){state.items.push({name:"",qty:1,price:""});renderItems()}
 const remove=e.target.closest("[data-remove]");if(remove){state.items.splice(Number(remove.dataset.remove),1);if(!state.items.length)state.items.push({name:"",qty:1,price:""});renderItems()}
 if(e.target.closest("#saveDocument"))saveDocument();
 if(e.target.closest("#saveBusinessProfile"))saveBusinessProfile();
 if(e.target.closest("#addCustomer")){const input=$("newCustomer"),value=input.value.trim();if(!value){toast("Enter a customer name.");return}if(!state.customers.some(c=>(c.name||c).toLowerCase()===value.toLowerCase()))state.customers.push({name:value});input.value="";persist();renderCustomers();toast("Customer added.")}
 const del=e.target.closest("[data-delete-customer]");if(del){state.customers.splice(Number(del.dataset.deleteCustomer),1);persist();renderCustomers()}
 if(e.target.closest("#stockPlaceholder"))toast("Stock management will be connected to the cloud database next.")
});
document.addEventListener("input",e=>{const t=e.target;if(t.dataset.item){state.items[Number(t.dataset.index)][t.dataset.item]=t.value;if(["qty","price"].includes(t.dataset.item))calculateTotal()}if(t.id==="discount"||t.id==="tax")calculateTotal()});
document.addEventListener("change",e=>{if(e.target.id==="settingsCurrency"){state.business.currency=e.target.value;persist();applyCurrencyUI();calculateTotal()}});
fillBusinessFields();renderDocuments();renderCustomers();renderStock();applyCurrencyUI();