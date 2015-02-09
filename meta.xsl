<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" 
                xmlns:em="http://www.mozilla.org/2004/em-rdf#"
                xmlns:NC="http://home.netscape.com/NC-rdf#"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<!--
  <xsl:output method="xml" indent="yes" encoding="utf-8"/>
-->
  <xsl:output indent="yes" encoding="utf-8" omit-xml-declaration="yes"/>

  <xsl:param name="extname" select="'greasebarrel'"/>
  <xsl:param name="target" select="'rdf'"/>
  <xsl:param name="extdomain" select="'github.com'"/>

  <xsl:template match="/install.rdf">
    <xsl:apply-templates select="." mode="rdf"/>
  </xsl:template>
  <xsl:template match="/chrome.manifest">
    <xsl:apply-templates select="." mode="manifest"/>
  </xsl:template>

  <xsl:template match="/*|/xsl:*" priority="-1">
    <xsl:choose>
      <xsl:when test="$target = 'rdf'">
        <xsl:apply-templates select="." mode="rdf"/>
      </xsl:when>
      <xsl:when test="$target = 'userrdf'">
        <xsl:apply-templates select="." mode="userrdf"/>
      </xsl:when>
      <xsl:when test="$target = 'manifest'">
        <xsl:apply-templates select="." mode="manifest"/>
      </xsl:when>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="*" mode="rdf">
    <rdf:RDF>
      <rdf:Description about="urn:mozilla:install-manifest">
        <em:id>greasebarrel</em:id>
        <em:type NC:parseType="Integer">32</em:type>
        <em:name>Greasebarrel</em:name>
        <em:version>0.0.1</em:version>
        <em:targetApplication>
          <rdf:Description>
            <em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id> 
            <em:minVersion>3.0</em:minVersion>
            <em:maxVersion>28.0.*</em:maxVersion> 
          </rdf:Description>
        </em:targetApplication>
        <em:strictCompatibility>false</em:strictCompatibility>
        <xsl:comment>
          don't sweat the maxVersion; see 
          https://developer.mozilla.org/en-US/docs/Install_Manifests#strictCompatibility
        </xsl:comment>
        <em:bootstrap>true</em:bootstrap>
      </rdf:Description>
    </rdf:RDF>
  </xsl:template>

  <xsl:template match="*" mode="userrdf">
    <rdf:RDF>
      <rdf:Description about="urn:mozilla:install-manifest">
        <em:id>
          <xsl:value-of select="$extname"/>
          <xsl:text>@</xsl:text>
          <xsl:value-of select="$extdomain"/>
        </em:id>
        <em:type NC:parseType="Integer">2</em:type>
        <em:name>
          <xsl:value-of select="$extname"/>
        </em:name>
        <em:version>0.0.1</em:version>
        <em:targetApplication>
          <rdf:Description>
            <em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id> 
            <em:minVersion>3.0</em:minVersion>
            <em:maxVersion>28.0.*</em:maxVersion> 
          </rdf:Description>
        </em:targetApplication>
        <em:strictCompatibility>false</em:strictCompatibility>
        <xsl:comment>
          don't sweat the maxVersion; see 
          https://developer.mozilla.org/en-US/docs/Install_Manifests#strictCompatibility
        </xsl:comment>
        <em:bootstrap>true</em:bootstrap>
      </rdf:Description>
    </rdf:RDF>
  </xsl:template>

  <xsl:template match="*" mode="manifest">
    <xsl:text>content      </xsl:text>
    <xsl:value-of select="$extname"/>
    <xsl:text> content/     </xsl:text>
    <xsl:text>&#10;</xsl:text>
    <xsl:text>skin         </xsl:text>
    <xsl:value-of select="$extname"/>
    <xsl:text> classic/1.0  </xsl:text>
    <xsl:text>skin/        </xsl:text>
    <xsl:text>&#10;</xsl:text>
    <xsl:text>locale       </xsl:text>
    <xsl:value-of select="$extname"/>
    <xsl:text> en-US        </xsl:text>
    <xsl:text>locale/en-US/</xsl:text>
    <xsl:text>&#10;</xsl:text>
  </xsl:template>

  <xsl:template match="/|*|@*|text()|node()" priority="-100">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>	
  </xsl:template>
</xsl:stylesheet>
