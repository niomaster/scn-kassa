Products = new Meteor.Collection("products");
Users = new Meteor.Collection("users");

Products.allow({
    insert: function() { return false; },
    remove: function() { return false; },
    update: function() { return false; }
});

Users.allow({
    insert: function() { return false; },
    remove: function() { return false; },
    update: function() { return false; }
});

function formatPrice(actualAmount) {
    var amount = Math.abs(actualAmount);
    var string = amount + '';
    
    while(string.length < 3) {
        string = '0' + string;
    }
    
    string = string.substring(0, string.length - 2) + ',' + string.substring(string.length - 2);
    
    for(var pos = string.length - 6; pos >= 1; pos -= 3) {
        string = string.substring(0, pos) + '.' + string.substring(pos);
    }
    
    return (actualAmount < 0 ? '-' : '') + '€' + string;
}

function groupBy(amount, array) {
    var groups = [];
    
    while(array.length > 0) {
        groups.push({ products: array.splice(0, 6) });
    }
    
    return groups;
}

Meteor.methods({
    addProduct: function(name, price, per) {
        if(!(typeof name == 'string' && name.length > 0 
            && typeof price == 'number' && price > 0
            && typeof per == 'number' && per > 0)) {
            throw new Meteor.error(400, "Invalid parameter");
            return;
        }
    
        Products.insert({
            name: name,
            price: price,
            per: per
        });
    },
    addUser: function(code, volunteer, password) {
        if(!(typeof code == 'number' && code > 0
            && typeof volunteer == 'boolean'
            && (!volunteer || (typeof password == 'string' && password.length > 2)))) {
            throw new Meteor.error(400, "Invalid parameter");
            return;
        }
        
        if(volunteer) {
            Users.insert({
                code: code,
                volunteer: true,
                password: password
            });
        } else {
            Users.insert({
                code: code,
                volunteer: false
            });
        }
    }
});

if (Meteor.isClient) {
    Meteor.subscribe('products');

    Session.set('tab', 'checkout');
    Session.set('loggedIn', false);
    Session.set('loginScreen', false);
    Session.set('selectedProducts', []);
    
    Template.kassa.checkout = function() { return Session.get('tab') == 'checkout'; }
    Template.kassa.addProduct = function() { return Session.get('tab') == 'addProduct'; }
    Template.kassa.addUser = function() { return Session.get('tab') == 'addUser'; }
    
    Template.kassa.loginScreen = function() { return Session.get('loginScreen'); }
    
    Template.navigation.checkout = function() { return Session.get('tab') == 'checkout'; }
    Template.navigation.addProduct = function() { return Session.get('tab') == 'addProduct'; }
    Template.navigation.addUser = function() { return Session.get('tab') == 'addUser'; }
    
    Template.navigation.loggedIn = function() { return Session.get('loggedIn'); }
    Template.navigation.userName = function() { return Session.get('userName'); }
    
    Template.navigation.events({
        'click .tab': function(event, template) {
            Session.set('tab', event.target.parentNode.id);
        },
        'click #login': function(event, template) {
            $('#loginScreen').show();
        }
    });
    
    Template.products.products = function() {
        var products = Products.find().fetch();
        
        for(var i = 0; i < products.length; i++) {
            products[i].formattedPrice 
                = formatPrice(products[i].price);
        }
        
        return groupBy(6, products);
    };
    
    Template.products.selectedProducts = function() {
        return Session.get('selectedProducts');
    };
    
    Template.products.total = function() {
        var total = 0;
        
        var selectedProducts = Session.get('selectedProducts');
        
        for(var i = 0; i < selectedProducts.length; i += 1) {
            total += selectedProducts[i].price * selectedProducts[i].count;
        }
        
        return formatPrice(total);
    };
    
    Template.product.events({
        'click .selectProduct': function(event, template) {        
            var selectedProducts = Session.get('selectedProducts');
        
            for(var i = 0; i < selectedProducts.length; i += 1) {
                console.log(selectedProducts[i]);
                if(selectedProducts[i]._id == template.data._id) {
                    selectedProducts[i].count += template.data.per;
                    Session.set('selectedProducts', selectedProducts);
                    return;
                }
            }
            
            var product = Products.findOne({_id: template.data._id});
            product.count = product.per;
            selectedProducts.push(product);
            Session.set('selectedProducts', selectedProducts);
        }
    });
    
    Template.selectedProduct.events({
        'click .removeSelectedProduct': function(event, template) {
            var selectedProducts = Session.get('selectedProducts');
        
            for(var i = 0; i < selectedProducts.length; i += 1) {
                console.log(selectedProducts[i]);
                if(selectedProducts[i]._id == template.data._id) {
                    selectedProducts[i].count -= template.data.per;
                    if(selectedProducts[i].count <= 0)
                        selectedProducts.splice(i, 1);
                    Session.set('selectedProducts', selectedProducts);
                    return;
                }
            }
        }
    });
    
    Template.addProductForm.events({
        'click #save': function(event, template) {
            var name = template.find('#name').value;
            var price = parseInt(template.find('#price').value);
            var per = parseInt(template.find('#per').value);
            
            Meteor.call('addProduct', name, price, per);
            
            template.find('#name').value = '';
            template.find('#price').value = '';
            template.find('#per').value = '';
        }
    });
    
    Template.addUserForm.events({
        'click #volunteer': function(event, template) {
            template.find('#passwordTr').style.display
                = template.find('#volunteer').checked ? '' : 'none';
        },
        'click #save': function(event, template) {
            var code = parseInt(template.find('#code').value);
            var volunteer = template.find('#volunteer').checked;
            var password = template.find('#password').value;
            
            Meteor.call('addUser', code, volunteer, password);
            
            template.find('#code').value = '';
            if(volunteer)
                template.find('#volunteer').click();
            template.find('#password').value = '';
        }
    });
}

if (Meteor.isServer) {
    Meteor.publish("products", function() {
        return Products.find();
    });
    
    Meteor.publish("users", function() {
        return Users.find();
    });
    
    Meteor.startup(function() {
        if(Products.find().count() == 0) {
            Products.insert({
                name: "Ionas",
                price: 200,
                per: 1
            });
        }
    });
}
