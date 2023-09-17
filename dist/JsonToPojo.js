
function jsonToPojoConverter() {
  var instance = {
    hasList: false,
    lombok: false,
    lombokData: false,
    lombokBuilder: false,
    openapi: false,
    innerClasses: false
  };

  function isDateFormat(value) {

    var fourDigits = '(\\d{4})';
    var zeroOneToTwelve = '((0[1-9])|(1[0-2]))';
    var zeroOneToThirtyOne = '((0[1-9])|([1-2]\\d)|(3[01]))';

    var yearMonthDay = '(' + fourDigits + '\\-' + zeroOneToTwelve + '\\-' + zeroOneToThirtyOne + ')';

    var dateRE = new RegExp('^' + yearMonthDay + '$', 'i');
    return dateRE.test(value);
  }

  function isDateTimeFormat(value) {

    var fourDigits = '(\\d{4})';
    var zeroOneToTwelve = '((0[1-9])|(1[0-2]))';
    var zeroOneToThirtyOne = '((0[1-9])|([1-2]\\d)|(3[01]))';

    var yearMonthDay = '(' + fourDigits + '\\-' + zeroOneToTwelve + '\\-' + zeroOneToThirtyOne + ')';

    var doubleZerosToTwelve = '((0\\d)|1[0-2])';
    var doubleZerosToTwentyThree = '(([0-1]\\d)|(2[0-3]))';
    var doubleZerosToFiftyNine = '([0-5]\\d)';
    var plusOrMinus = '(\\+|\\-)';

    var timeZone = '(Z|(' + plusOrMinus + doubleZerosToTwelve + doubleZerosToFiftyNine + '))?';
    var hoursMinutes = doubleZerosToTwentyThree + ':' + doubleZerosToFiftyNine;
    var secondsMiliseconds = '((:' + doubleZerosToFiftyNine + ')(\\.\\d{1,3})?)?';

    var dateTimeRE = new RegExp('^' + yearMonthDay + 'T' + hoursMinutes + secondsMiliseconds + timeZone + '$', 'i');

    return dateTimeRE.test(value);
  }

  function mergeArrayObjects(objArray) {
    var result = {};

    for (var i = 0; i < objArray.length; i++) {
      for (var field in objArray[i]) {
        if (!result.hasOwnProperty(field)) {
          result[field] = objArray[i][field];
        }
      }
    }

    return result;
  }

  function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
  }

  function lowercase(stringValue) {
    return stringValue[0].toLowerCase() + stringValue.slice(1);
  }

  function snakeCaseToCamelCase(fieldName) {
    var tokens = (fieldName + "").split(/[^0-9a-z]/i);
    var result = [];
    for (var token of tokens) {
      result.push(capitalize(token));
    }
    return result.join("");
  }


  function getJavaType(type) {
    switch (type) {
      case 'array':
        return 'List';
      case 'object':
      case 'string':
      case 'localDate':
      case 'localDateTime':
        return capitalize(type);
      case 'integer':
        return 'Integer';
      case 'double':
        return 'BigDecimal';
      case 'boolean':
      default:
        return type;
    }
  }

  function getType(val, config) {
    var typeInfo = {
      'type': typeof val
    };
    typeInfo.example = (val + "").trim();
    typeInfo.list = false;

    switch (typeInfo.type) {
      case 'object':
        typeInfo.example = "";
        // if the object is an array, get type of array content
        // otherwise, get the definition of the object value itself
        if (Array.isArray(val)) {
          typeInfo.type = 'array';
          typeInfo.list = true;
          config.hasList = true;

          if (typeof val[0] === 'object') {
            typeInfo.definition = getType(mergeArrayObjects(val), config);
          } else if (typeof val[0] === 'undefined') {
            typeInfo.definition = getType('', config);
          } else {
            typeInfo.definition = getType(val[0], config);
          }
        } else {
          typeInfo.definition = getObjectDefinition(val, config);
        }

        break;
      case 'string':
        if (isDateFormat(val)) {
          typeInfo.type = 'localDate';
          config.hasLocalDate = true;
        } else if (isDateTimeFormat(val)) {
          typeInfo.type = 'localDateTime';
          config.hasLocalDateTime = true;
        }
        break;
      case 'number':
        if (Number.isInteger(val)) {
          typeInfo.type = 'integer';
        } else {
          typeInfo.type = 'double';
        }

        break;
    }

    return typeInfo;
  }

  function getObjectDefinition(obj, config) {
    var objectDefinition = {};

    // create a definition object that contains a map
    // of field names to field types, recursing on object
    // field types
    for (field in obj) {
      //if ((field + "").indexOf("_") >= 0) {
      config.hasSnake = true;
      //}
      if ("past_types" === field) {
        console.log(typeof obj[field][0] === 'undefined');
      }
      objectDefinition[field] = getType(obj[field], config);
    }

    return objectDefinition;
  }

  function getImports(className, classList, classSnake, config) {

    if (config.innerClasses && config.rootClassName != className) {
      return '';
    }
    var result = '';

    if (config.innerClasses && config.rootClassName == className) {

      if (config.hasLocalDate) {
        result += 'import java.time.LocalDate;\n\n\n';
      }

      if (config.hasLocalDateTime) {
        result += 'import java.time.LocalDateTime;\n\n\n';
      }

      if (config.hasList) {
        result += 'import java.util.List;\n\n\n';
      }

      if (config.jsonProperties) {
        result += 'import com.fasterxml.jackson.annotation.JsonProperty;\n\n\n';
      }

    } else if (!config.innerClasses) {
      if (classList) {
        result += 'import java.util.List;\n\n\n';
      }
      if (classSnake) {
        result += 'import com.fasterxml.jackson.annotation.JsonProperty;\n\n\n';
      }

    }

    if (config.lombok || config.openapi) { // imports
      if (config.lombokData) {
        result += 'import lombok.Data;\n';
        result += 'import lombok.experimental.Accessors;\n';
      }
      if (config.lombokBuilder) {
        result += 'import lombok.Builder;\n';
        result += 'import lombok.Getter;\n';
        result += 'import lombok.ToString;\n';
        result += 'import lombok.EqualsAndHashCode;\n';
      }
      if (config.openapi) {
        result += 'import javax.validation.Valid;\n';
        result += 'import javax.validation.constraints.NotEmpty;\n';
        result += 'import javax.validation.constraints.NotNull;\n';
        result += 'import io.swagger.annotations.ApiModel;\n';
        result += 'import io.swagger.annotations.ApiModelProperty;\n';
      }
      result += '\n\n'
    }
    return result;
  }


  function getClassAnnotations(config, className, identLevel) {
    var identSpaces = getIdentLevel(identLevel);
    var result = '';
    if (config.lombok || config.openapi) {
      if (config.lombokData) {
        result += identSpaces + '@Data\n';
        result += identSpaces + '@Accessors(chain = true)\n';
      }
      if (config.lombokBuilder) {
        result += identSpaces + '@Builder\n';
        result += identSpaces + '@Getter\n';
        result += identSpaces + '@ToString\n';
        result += identSpaces + '@EqualsAndHashCode(callSuper = false)\n';
      }
      if (config.openapi) {
        result += identSpaces + '@ApiModel(value = "' + className + '", description = "' + className + '")\n';
      }
    }
    return result;
  }

  function getIdentLevel(level) {
    var result = '';
    for (var i = 0; i < level; i++) {
      result += '  ';
    }
    return result;
  }

  function getJavaClassDefinition(className, classList, classSnake, fields, config, identLevel) {
    var identSpaces = getIdentLevel(identLevel);
    var result = '\n\n';

    result += getImports(className, classList, classSnake, config);

    result += getClassAnnotations(config, className, identLevel);

    if (config.innerClasses && config.rootClassName != className) {
      result += identSpaces + 'public static class ' + className + ' {\n\n';
    } else {
      result += identSpaces + 'public class ' + className + ' {\n\n';
    }

    var subClasses = [];
    identSpaces = getIdentLevel(identLevel + 1);
    for (var i = 0; i < fields.length; i++) {

      if (config.openapi) {
        result += identSpaces + '@NotNull\n';
        if (fields[i].type === 'array') {
          result += identSpaces + '@NotEmpty\n';
        }
        if (fields[i].type === 'object') {
          result += identSpaces + '@Valid\n';
        }
        result += identSpaces + '@ApiModelProperty(name = "' + fields[i].jsonProp + '"';
        if ((fields[i].example + "").trim() !== '') result += ', example = "' + fields[i].example + '"';
        result += ')\n';
      }
      //if (fields[i].fieldName != fields[i].jsonProp) {
      if (config.jsonProperties) {
        result += identSpaces + '@JsonProperty("' + fields[i].jsonProp + '")\n';
      }


      result += identSpaces + 'private ' + fields[i].typeDeclaration + ' ' + fields[i].fieldName + ';\n\n';

      subClasses = subClasses.concat(fields[i].subClasses);
    }
    identSpaces = getIdentLevel(identLevel);

    if (config.innerClasses) {

      while (subClasses.length > 0) {
        var cls = subClasses.shift();

        result += runFieldDefinition(cls, config, subClasses, identLevel + 1);
      }

    }



    result += identSpaces + '}\n';

    return result;
  }

  function invalidClassName(className) {
    var empty = ((className + '').trim() === '');
    var firstLetter = (!!(className + '').charAt(0).match(/[^A-Z]/i));
    var alphanumeric = (!(className + '').match(/^[a-z0-9]+$/gi));



    return empty || firstLetter || alphanumeric;
  }

  instance.convert = function (json, lombokData, lombokBuilder, openapi, innerClasses, jsonProperties, rootClassName) {

    rootClassName = invalidClassName(rootClassName) ? 'RootClass' : capitalize(rootClassName);

    var config = {
      rootClassName: rootClassName,
      lombok: lombokData || lombokBuilder,
      lombokData: lombokData,
      lombokBuilder: lombokBuilder,
      openapi: openapi,
      innerClasses: innerClasses,
      hasList: false,
      jsonProperties: jsonProperties,
      hasSnake: false
    }

    try {
      var objectDefinition = getObjectDefinition(JSON.parse(json), config);
    } catch (ex) {
      return ex;
    }

    var classQueue = [
      {
        'name': config.rootClassName,
        'definition': objectDefinition
      }
    ];

    var result = '';
    var identLevel = 0;


    while (classQueue.length > 0) {
      var cls = classQueue.shift();

      result += runFieldDefinition(cls, config, classQueue, identLevel);
    }



    return result;
  }

  function runFieldDefinition(cls, config, classQueue, identLevel) {
    var result = '';
    var classList = false;
    var fields = [];
    var classSnake = false;

    for (var field in cls.definition) {
      var subClasses = []
      var currField = cls.definition[field];

      var type = currField.type;
      var example = currField.example;
      classList = currField.list || classList;
      var arrayType = '';
      var objType = undefined;

      var fieldName = field;

      if (config.jsonProperties) {
        classSnake = true;
        fieldName = lowercase(snakeCaseToCamelCase(field));
      }

      if (type === 'array') {
        if (currField.definition.type === 'object') {
          if (config.innerClasses) {
            subClasses.push({
              'name': capitalize(fieldName),
              'definition': currField.definition.definition
            });
          } else {
            classQueue.push({
              'name': capitalize(fieldName),
              'definition': currField.definition.definition
            });
          }

          arrayType = (config.openapi ? '<@Valid ' : '<') + capitalize(fieldName) + '>';
        } else {
          arrayType = (config.openapi ? '<@Valid ' : '<') + capitalize(currField.definition.type) + '>';
        }
      }

      if (type === 'object') {
        objType = capitalize(fieldName);

        if (config.innerClasses) {
          subClasses.push({
            'name': objType,
            'definition': currField.definition
          });
        } else {
          classQueue.push({
            'name': objType,
            'definition': currField.definition
          });
        }


      }

      var typeDeclaration = objType ? objType : getJavaType(type) + arrayType;

      fields.push({
        'fieldName': fieldName,
        'jsonProp': field,
        'typeDeclaration': typeDeclaration,
        'type': type,
        'example': example,
        'subClasses': subClasses
      });
    }

    result += getJavaClassDefinition(cls.name, classList, classSnake, fields, config, identLevel);

    return result;
  }

  return instance;
}

